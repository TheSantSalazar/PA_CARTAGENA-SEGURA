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
                        // Endpoints públicos
                        .requestMatchers(
                                "/api/auth/**",                    // login/register
                                "/api/users/register",             // registro público
                                "/",                               // raíz
                                "/*.html",                         // <--- CORRECCIÓN CLAVE: Permite acceso a auth.html, home.html, etc.
                                "/static/**",                      // archivos estáticos (CSS, JS, etc)
                                "/**.js",                          // scripts
                                "/**.css",                         // estilos
                                "/**.png", "/**.jpg", "/**.gif",  // imágenes
                                "/**.woff", "/**.woff2",          // fuentes
                                "/favicon.ico"                     // favicon
                        ).permitAll()

                        // Endpoints que requieren autenticación
                        .requestMatchers("/api/incidents/**").authenticated()
                        .requestMatchers("/api/users/**").authenticated()

                        // ENDPOINTS ML - CONFIGURACIÓN SEGÚN NECESIDAD
                        // Por ahora permitir todo ML (ya que el JS del frontend lo usa)
                        .requestMatchers("/api/ml/**").permitAll()

                        // El resto requiere autenticación
                        .anyRequest().authenticated()
                )

                // Política sin sesión (JWT)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Añadir el filtro JWT
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}