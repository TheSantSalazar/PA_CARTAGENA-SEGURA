package com.cartagena.segura.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MLSecurityConfig {

    /**
     * Configuración CORS extendida para incluir endpoints ML
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600);

                // Específicamente para archivos estáticos
                registry.addMapping("/static/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "HEAD")
                        .maxAge(86400);
            }
        };
    }
}