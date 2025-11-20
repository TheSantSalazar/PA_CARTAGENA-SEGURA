package com.cartagena.segura.backend.service;

import com.cartagena.segura.backend.model.Incident;
import com.cartagena.segura.backend.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class IncidentService {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private LogService logService; // 👈 añadimos el servicio de logs

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public Incident createIncident(Incident incident) {
        Incident saved = incidentRepository.save(incident);
        // 👇 Log automático
        logService.createLog("CREAR_INCIDENTE", "sistema",
                "Se creó un incidente tipo '" + incident.getType() + "' en '" + incident.getLocation() + "'");
        return saved;
    }

    public Optional<Incident> getIncidentById(String id) {
        return incidentRepository.findById(id);
    }

    public void deleteIncident(String id) {
        incidentRepository.deleteById(id);
        // 👇 Log automático
        logService.createLog("ELIMINAR_INCIDENTE", "sistema",
                "Se eliminó el incidente con ID: " + id);
    }

    public List<Incident> getIncidentsByStatus(Incident.Status status) {
        return incidentRepository.findByStatus(status);
    }

    public Incident updateIncidentStatus(String id, Incident.Status newStatus) {
        Optional<Incident> optionalIncident = incidentRepository.findById(id);
        if (optionalIncident.isPresent()) {
            Incident incident = optionalIncident.get();
            incident.setStatus(newStatus);
            Incident updated = incidentRepository.save(incident);
            // 👇 Log automático
            logService.createLog("ACTUALIZAR_ESTADO", "sistema",
                    "Incidente ID: " + id + " cambiado a estado: " + newStatus);
            return updated;
        } else {
            return null;
        }
    }
}
