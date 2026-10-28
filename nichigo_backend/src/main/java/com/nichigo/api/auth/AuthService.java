package com.nichigo.api.auth;

import com.nichigo.api.auth.dto.RegisterRequest;
import com.nichigo.api.auth.user.AuthUser;
import com.nichigo.api.auth.user.UserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService implements UserDetailsService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthUser register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new InvalidRegistrationException("Password must be at most 72 UTF-8 bytes.");
        }
        try {
            return userRepository.create(email, passwordEncoder.encode(request.password()));
        } catch (DuplicateKeyException exception) {
            // The database's unique index is the final guard against concurrent registrations.
            throw new DuplicateEmailException();
        }
    }

    public AuthUser getByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        AuthUser user = getByEmail(email);
        return User.withUsername(user.email())
                .password(user.passwordHash())
                .authorities("USER")
                .build();
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
