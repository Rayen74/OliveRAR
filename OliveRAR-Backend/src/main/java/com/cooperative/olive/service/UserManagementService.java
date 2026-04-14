package com.cooperative.olive.service;

import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Ouvrier;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
@Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MongoTemplate mongoTemplate;

    public List<User> getAllManagedUsers() {
        return userRepository.findByRoleNot(Role.RESPONSABLE_COOPERATIVE);
    }

    public Page<User> getManagedUsersPage(int page, int size) {
        return getManagedUsersPage(page, size, null, null);
    }

    public Page<User> getManagedUsersPage(int page, int size, String name, Role role) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 7 : Math.min(size, 50);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("nom").ascending());

        Criteria criteria;
        if (role != null) {
            criteria = Criteria.where("role").is(role.name());
        } else {
            criteria = Criteria.where("role").ne(Role.RESPONSABLE_COOPERATIVE.name());
        }

        if (name != null && !name.isBlank()) {
            String regex = ".*" + Pattern.quote(name.trim()) + ".*";
            Criteria nameCriteria = new Criteria().orOperator(
                    Criteria.where("nom").regex(regex, "i"),
                    Criteria.where("prenom").regex(regex, "i")
            );
            criteria = new Criteria().andOperator(criteria, nameCriteria);
        }

        Query query = new Query(criteria).with(pageable);
        List<User> users = mongoTemplate.find(query, User.class);
        Query countQuery = new Query(criteria);
        long total = mongoTemplate.count(countQuery, User.class);

        return PageableExecutionUtils.getPage(users, pageable, () -> total);
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    public User createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Cet email est deja utilise par un autre compte.");
        }

        validateProfileFields(user);
        validatePhoneNumber(user.getPhoneNumber());
        validatePassword(user.getPassword());

        if (user.getRole() == Role.RESPONSABLE_COOPERATIVE) {
            throw new RuntimeException("Action non autorisee.");
        }

        user.setId(null);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        if (user.getRole() == Role.OUVRIER) {
            Ouvrier ouvrier = new Ouvrier();
            ouvrier.setNom(user.getNom());
            ouvrier.setPrenom(user.getPrenom());
            ouvrier.setEmail(user.getEmail());
            ouvrier.setPhoneNumber(user.getPhoneNumber());
            ouvrier.setRole(user.getRole());
            ouvrier.setPassword(user.getPassword());
            ouvrier.setImageUrl(user.getImageUrl());
            return userRepository.save(ouvrier);
        }
        
        return userRepository.save(user);
    }

    public User updateUser(String id, User userDetails) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (userRepository.existsByEmailAndIdNot(userDetails.getEmail(), id)) {
            throw new RuntimeException("Cet email est deja utilise par un autre compte.");
        }

        validateProfileFields(userDetails);
        validatePhoneNumber(userDetails.getPhoneNumber());

        existingUser.setNom(userDetails.getNom());
        existingUser.setPrenom(userDetails.getPrenom());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setPhoneNumber(userDetails.getPhoneNumber());
        existingUser.setRole(userDetails.getRole());

        String newPassword = userDetails.getPassword();
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            validatePassword(newPassword);
            existingUser.setPassword(passwordEncoder.encode(newPassword));
        }

        if (userDetails.getRole() == Role.OUVRIER && !(existingUser instanceof Ouvrier)) {
            // Need to convert existing User to Ouvrier
            Ouvrier ouvrier = new Ouvrier();
            ouvrier.setId(existingUser.getId());
            ouvrier.setNom(existingUser.getNom());
            ouvrier.setPrenom(existingUser.getPrenom());
            ouvrier.setEmail(existingUser.getEmail());
            ouvrier.setPhoneNumber(existingUser.getPhoneNumber());
            ouvrier.setRole(existingUser.getRole());
            ouvrier.setPassword(existingUser.getPassword());
            ouvrier.setImageUrl(existingUser.getImageUrl());
            userRepository.deleteById(existingUser.getId());
            return userRepository.save(ouvrier);
        }

        return userRepository.save(existingUser);
    }

    public User updateProfile(String id, User userDetails) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (userRepository.existsByEmailAndIdNot(userDetails.getEmail(), id)) {
            throw new RuntimeException("Cet email est deja utilise par un autre compte.");
        }

        validateProfileFields(userDetails);
        validatePhoneNumber(userDetails.getPhoneNumber());

        existingUser.setNom(userDetails.getNom());
        existingUser.setPrenom(userDetails.getPrenom());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setPhoneNumber(userDetails.getPhoneNumber());

        return userRepository.save(existingUser);
    }

    public User updateProfileImage(String id, String imageUrl) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        existingUser.setImageUrl(imageUrl);
        return userRepository.save(existingUser);
    }

    public List<User> getUsersByRole(Role role) {
        return userRepository.findByRole(role);
    }

    public List<User> getUsersByRoleAndDisponibilite(Role role, String disponibilite) {
        Query query = new Query();
        query.addCriteria(Criteria.where("role").is(role.name()));
        query.addCriteria(Criteria.where("disponibilite").is(disponibilite));
        return mongoTemplate.find(query, User.class);
    }

    public void deleteUser(String id) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (existing.getRole() == Role.RESPONSABLE_COOPERATIVE) {
            throw new RuntimeException("Suppression non autorisee");
        }

        userRepository.deleteById(id);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Le mot de passe doit contenir au moins 8 caracteres");
        }

        if (!password.matches(".*[0-9].*")
                || !password.matches(".*[A-Z].*")
                || !password.matches(".*[a-z].*")
                || !password.matches(".*[@#$%^&+=!*?].*")) {
            throw new RuntimeException(
                    "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractere special."
            );
        }
    }

    private void validatePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new RuntimeException("Le numero de telephone est obligatoire.");
        }

        if (!phoneNumber.matches("\\d{8}")) {
            throw new RuntimeException("Le numero de telephone doit contenir exactement 8 chiffres.");
        }
    }

    private void validateProfileFields(User user) {
        if (user.getPrenom() == null || user.getPrenom().isBlank()) {
            throw new RuntimeException("Le prenom est obligatoire.");
        }

        if (user.getNom() == null || user.getNom().isBlank()) {
            throw new RuntimeException("Le nom est obligatoire.");
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new RuntimeException("L email est obligatoire.");
        }

        if (!user.getEmail().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new RuntimeException("Le format de l email est invalide.");
        }
    }
}
