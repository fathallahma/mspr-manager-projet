package com.mspr.services;

import com.mspr.models.User;
import com.mspr.repositories.UserRepository;
import com.mspr.tools.QRCodeUtil;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private static final long SIX_MONTHS_IN_SECONDS = 15778463;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Map<String, Object> authenticateUser(String username, String password, String code2fa) {
        Map<String, Object> response = new HashMap<>();
        User user = userRepository.findByUsername(username);

        if (user == null) {
            response.put("success", false);
            response.put("message", "Utilisateur non trouvé");
            return response;
        }

        long now = System.currentTimeMillis() / 1000;
        if (user.getGendate() == null || now - user.getGendate() > SIX_MONTHS_IN_SECONDS) {
            user.setExpired(true);
            userRepository.save(user);
            response.put("expired", true);
            response.put("message", "Compte expiré");
            return response;
        }

        if (!BCrypt.checkpw(password, user.getPassword())) {
            response.put("success", false);
            response.put("message", "Mot de passe incorrect");
            return response;
        }

        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        boolean isCodeValid = gAuth.authorize(user.getSecret2fa(), Integer.parseInt(code2fa));
        if (!isCodeValid) {
            response.put("success", false);
            response.put("message", "Code 2FA invalide");
            return response;
        }

        response.put("success", true);
        response.put("message", "Authentication success");
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        return response;
    }

    public Map<String, Object> generatePassword(String username) {
        Map<String, Object> response = new HashMap<>();

        // 1. Générer mot de passe
        String plainPassword = generateSecurePassword(24);
        String hashedPassword = BCrypt.hashpw(plainPassword, BCrypt.gensalt());

        // 2. Générer QR Code (contenant le mot de passe en clair)
        String qrBase64 = QRCodeUtil.generateQRCodeBase64(plainPassword);

        // 3. Enregistrer l’utilisateur
        User user = new User();
        user.setUsername(username);
        user.setPassword(hashedPassword);
        user.setGendate(System.currentTimeMillis() / 1000);
        user.setExpired(false);
        userRepository.save(user);

        // 4. Réponse complète
        response.put("plainPassword", plainPassword);
        response.put("qrcode", qrBase64);
        return response;
    }


    private String generateSecurePassword(int length) {
        String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lower = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "!@#$%^&*()-_=+[]{}";
        String all = upper + lower + digits + special;

        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder();

        password.append(upper.charAt(random.nextInt(upper.length())));
        password.append(lower.charAt(random.nextInt(lower.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));

        for (int i = 4; i < length; i++) {
            password.append(all.charAt(random.nextInt(all.length())));
        }

        return password.toString();
    }

    public Map<String, Object> generate2FA(String username) {
        Map<String, Object> response = new HashMap<>();

        User user = userRepository.findByUsername(username);
        if (user == null) {
            response.put("message", "Utilisateur non trouvé");
            return response;
        }

        // 1. Génère un secret TOTP
        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();

        // 2. Format otpauth URI
        String issuer = "MSPR-AuthApp";
        String otpAuthURL = String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s",
                issuer, username, secret, issuer);

        // 3. Générer QRCode
        String qrBase64 = QRCodeUtil.generateQRCodeBase64(otpAuthURL);

        // 4. Enregistrer le secret dans l’utilisateur
        user.setSecret2fa(secret);
        userRepository.save(user);

        // 5. Retour
        response.put("qrcode", qrBase64);
        response.put("message", "2FA généré");
        return response;
    }
}
