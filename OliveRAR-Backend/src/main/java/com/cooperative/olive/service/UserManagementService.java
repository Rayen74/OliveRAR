package com.cooperative.olive.service;

import com.cooperative.olive.dao.UserRepository;
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
                    Criteria.where("prenom").regex(regex, "i"));
            criteria = new Criteria().andOperator(criteria, nameCriteria);
        }

        Query query = new Query(criteria).with(pageable);
        List<User> users = mongoTemplate.find(query, User.class);
        Query countQuery = new Query(criteria);
        long total = mongoTemplate.count(countQuery, User.class);

        return PageableExecutionUtils.getPage(users, pageable, () -> total);
    }

    public User createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Cet email est deja utilise par un autre compte.");
        }

        validatePassword(user.getPassword());

        if (user.getRole() == Role.RESPONSABLE_COOPERATIVE) {
            throw new RuntimeException("Action non autorisee.");
        }

        user.setId(null);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User updateUser(String id, User userDetails) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 1. Mise à jour des champs de base
        existingUser.setNom(userDetails.getNom());
        existingUser.setPrenom(userDetails.getPrenom());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setRole(userDetails.getRole());

        // 2. Logique conditionnelle pour le mot de passe
        String newPassword = userDetails.getPassword();
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            // On n'appelle votre validation que si un nouveau mot de passe est saisi
            validatePassword(newPassword);
            existingUser.setPassword(passwordEncoder.encode(newPassword));
        }
        // Si vide, existingUser.getPassword() reste l'ancien mot de passe

        return userRepository.save(existingUser);
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
                    "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractere special.");
        }
    }
}
