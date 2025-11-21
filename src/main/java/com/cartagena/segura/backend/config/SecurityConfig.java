package com.cartagena.segura.backend.config;

import com.cartagena.segura.backend.security.JwtAuthFilter;
import com.cartagena.segura.backend.security.JwtUtil;
import com.cartagena.segura.backend.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtUtil jwtUtil, UserService userService) {
        return new JwtAuthFilter(jwtUtil, userService);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
                // Deshabilitar CSRF ya que usamos JWT
                .csrf(csrf -> csrf.disable())

                // Configurar reglas de acceso
                .authorizeHttpRequests(auth -> auth
                        // PÁGINAS PÚBLICAS (acceso sin autenticación)
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/home.html",           // Home público
                                "/auth.html",           // Login/Register

                                // Recursos estáticos
                                "/css/**",
                                "/js/**",
                                "/assets/**",
                                "/**.css",
                                "/**.js",
                                "/**.html",
                                "/**.png", "/**.jpg", "/**.jpeg", "/**.gif",
                                "/**.ico",
                                "/**.svg",
                                "/**.woff", "/**.woff2", "/**.ttf",
                                "/favicon.ico",

                                // APIs públicas
                                "/api/auth/**",         // login/register
                                "/api/users/register",  // registro público
                                "/api/ml/**"           // ML endpoints (públicos por ahora)
                        ).permitAll()

                        // PÁGINAS PROTEGIDAS (requieren autenticación)
                        .requestMatchers(
                                "/incidents.html",      // Gestión de incidentes
                                "/map.html",           // Mapa de incidentes
                                "/ml-dashboard.html",   // Dashboard ML
                                "/profile.html"        // Perfil de usuario
                        ).authenticated()

                        // APIs PROTEGIDAS (requieren autenticación)
                        .requestMatchers("/api/incidents/**").authenticated()
                        .requestMatchers("/api/users/**").authenticated()

                        // Cualquier otra cosa requiere autenticación
                        .anyRequest().authenticated()
                )

                // Política sin sesión (JWT)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Añadir el filtro JWT
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}