package com.autodeploy.model;

public class PreferenciasNotificacion {

    private boolean email = true;
    private boolean alertasCriticas = true;
    private boolean eventosDespliegue = true;

    public PreferenciasNotificacion() {}

    public boolean isEmail() { return email; }
    public void setEmail(boolean email) { this.email = email; }

    public boolean isAlertasCriticas() { return alertasCriticas; }
    public void setAlertasCriticas(boolean alertasCriticas) { this.alertasCriticas = alertasCriticas; }

    public boolean isEventosDespliegue() { return eventosDespliegue; }
    public void setEventosDespliegue(boolean eventosDespliegue) { this.eventosDespliegue = eventosDespliegue; }
}
