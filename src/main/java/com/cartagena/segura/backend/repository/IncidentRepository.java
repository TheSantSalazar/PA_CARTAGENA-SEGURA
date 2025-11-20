package com.cartagena.segura.backend.repository;

import com.cartagena.segura.backend.model.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {
    List<Incident> findByStatus(Incident.Status status);
}
