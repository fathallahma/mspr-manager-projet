package com.mspr.credentials;

import lombok.Data;

@Data
public class UserCredentials {
    private String username;
    private String password;
    private String code2fa;

    // Getters et setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getCode2fa() {
        return code2fa;
    }

    public void setCode2fa(String code2fa) {
        this.code2fa = code2fa;
    }
}

