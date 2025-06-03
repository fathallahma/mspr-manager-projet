package com.mspr.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    private String username;       // login
    private String password;       // chiffré avec BCrypt
    private String secret2fa;      // TOTP secret (ex: JBSWY3DPEHPK3PXP)
    private Long gendate;          // timestamp en secondes
    private Boolean expired;       // true si + de 6 mois
}
