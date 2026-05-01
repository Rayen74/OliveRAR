package com.cooperative.olive.dao;

import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    User findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, String id);
    List<User> findByRoleNot(Role role);
    Page<User> findByRoleNot(Role role, Pageable pageable);
    User findByResetToken(String resetToken);
    List<User> findByRole(Role role);
}
