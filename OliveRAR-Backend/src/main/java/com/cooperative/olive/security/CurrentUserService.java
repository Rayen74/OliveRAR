package com.cooperative.olive.security;

import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.exception.ForbiddenOperationException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public Optional<User> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        String email = authentication.getName();
        return Optional.ofNullable(userRepository.findByEmail(email));
    }

    public User getRequiredCurrentUser() {
        return getCurrentUser().orElseThrow(() -> new ForbiddenOperationException("Utilisateur authentifié requis."));
    }

    public void requireRole(Role... roles) {
        User currentUser = getRequiredCurrentUser();
        boolean allowed = Arrays.stream(roles).anyMatch(role -> role == currentUser.getRole());
        if (!allowed) {
            throw new ForbiddenOperationException("Action non autorisée pour ce rôle.");
        }
    }

    public void requireOwnerOrRole(String ownerId, Role... roles) {
        User currentUser = getRequiredCurrentUser();
        boolean isOwner = ownerId != null && ownerId.equals(currentUser.getId());
        boolean hasAllowedRole = Arrays.stream(roles).anyMatch(role -> role == currentUser.getRole());

        if (!isOwner && !hasAllowedRole) {
            throw new ForbiddenOperationException("Vous n'êtes pas autorisé à accéder à cette ressource.");
        }
    }

    public User requireUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }
}
