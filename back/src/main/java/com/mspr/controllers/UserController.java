package com.mspr.controllers;

import com.mspr.credentials.UserCredentials;
import com.mspr.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("api/v1/user")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> authenticateUser(@RequestBody UserCredentials credentials) {
        String username = credentials.getUsername();
        String password = credentials.getPassword();
        String code2fa = credentials.getCode2fa();

        Map<String, Object> result = userService.authenticateUser(username, password, code2fa);

        if ("Authentication success".equals(result.get("message"))) {
            System.out.println("##### OK");
            return ResponseEntity.ok(result);
        } else if ("Expired password".equals(result.get("message"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(result);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }
    }


    @PostMapping("/generate-password")
    public ResponseEntity<Map<String, Object>> generatePassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> result = userService.generatePassword(username);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/generate-2fa")
    public ResponseEntity<Map<String, Object>> generate2FA(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        Map<String, Object> result = userService.generate2FA(username);
        return ResponseEntity.ok(result);
    }

}

