document.addEventListener("DOMContentLoaded", function () {
  // Carregar dados iniciais
  loadBases();
  loadAgents();
  loadVehicles();
  loadServices();

  // Mostrar/ocultar base de destino com base no tipo selecionado
  document
    .getElementById("end_location_type")
    .addEventListener("change", function () {
      const endBaseGroup = document.getElementById("end_base_group");
      if (this.value === "operational_base") {
        endBaseGroup.classList.remove("hidden");
        loadBases("end_location_base_id");
      } else {
        endBaseGroup.classList.add("hidden");
      }
    });

  // Evento para atualizar serviços
  document
    .getElementById("refreshServices")
    .addEventListener("click", loadServices);

  // Funções para carregar dados de bases, agentes, veículos e serviços
  async function loadBases(selectId = "start_location_base_id") {
    try {
      const response = await fetch("/api/operational-bases");
      const data = await response.json();
      const select = document.getElementById(selectId);
      select.innerHTML = '<option value="">Selecione...</option>';
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((base) => {
          if (base.id && base.name) {
            select.innerHTML += `<option value="${base.id}">${base.name}</option>`;
          }
        });
      } else {
        select.innerHTML += '<option value="">Nenhuma base encontrada</option>';
      }
    } catch (error) {
      console.error("Erro ao carregar bases:", error);
      document.getElementById(selectId).innerHTML =
        '<option value="">Erro ao carregar</option>';
    }
  }

  async function loadAgents() {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();
      const select = document.getElementById("agent_id");
      select.innerHTML = '<option value="">Selecione...</option>';
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((agent) => {
          if (agent.id && agent.name) {
            select.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
          }
        });
      } else {
        select.innerHTML +=
          '<option value="">Nenhum agente encontrado</option>';
      }
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
      document.getElementById("agent_id").innerHTML =
        '<option value="">Erro ao carregar</option>';
    }
  }

  async function loadVehicles() {
    try {
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      const select = document.getElementById("vehicle_id");
      select.innerHTML = '<option value="">Nenhum</option>';
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((vehicle) => {
          if (vehicle.id && vehicle.name) {
            select.innerHTML += `<option value="${vehicle.id}">${vehicle.name}</option>`;
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    }
  }

  async function loadServices() {
    try {
      const response = await fetch("/api/services");
      const data = await response.json();
      const container = document.getElementById("servicesList");
      container.innerHTML = "";
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((service) => {
          if (service.id) {
            const div = document.createElement("div");
            div.className = "service-item";
            div.innerHTML = `
              <label>
                <input type="checkbox" name="services" value="${service.id}">
                ${service.id} - ${service.code || "N/A"} - ${
              service.title || "Sem título"
            }
              </label>
            `;
            container.appendChild(div);
          }
        });
      } else {
        container.innerHTML = "<p>Nenhum serviço disponível</p>";
      }
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      document.getElementById("servicesList").innerHTML =
        "Erro ao carregar serviços";
    }
  }

  // Evento do submit do formulário de criação de rota
  document
    .getElementById("routeForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      // Seleciona os serviços marcados
      const selectedServices = Array.from(
        document.querySelectorAll('input[name="services"]:checked')
      ).map((cb) => ({
        type: "service",
        service_id: parseInt(cb.value),
        prevision_break_time: 0,
      }));

      const routeData = {
        name: document.getElementById("name").value,
        start_at: document.getElementById("start_at").value + ":00",
        start_location_base_id: parseInt(
          document.getElementById("start_location_base_id").value
        ),
        end_location_type: document.getElementById("end_location_type").value,
        agent_id: parseInt(document.getElementById("agent_id").value),
        transport_mode: "driving",
        activities: selectedServices,
        source: "manual",
      };

      // Se o tipo de destino for base operacional, adicionar o id da base de destino
      if (routeData.end_location_type === "operational_base") {
        const endBaseId = document.getElementById("end_location_base_id").value;
        if (endBaseId) {
          routeData.end_location_base_id = parseInt(endBaseId);
        }
      }
      // Veículo é opcional
      const vehicleId = document.getElementById("vehicle_id").value;
      routeData.vehicle_id = vehicleId ? parseInt(vehicleId) : null;

      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(routeData),
        });
        const result = await response.json();
        const resultDiv = document.getElementById("result");
        if (response.ok) {
          resultDiv.innerHTML = `
          <h3 style="color: green;">Rota criada com sucesso!</h3>
          <pre>${JSON.stringify(result, null, 2)}</pre>
        `;
          document.getElementById("routeForm").reset();
          loadServices(); // Recarrega os serviços disponíveis
        } else {
          resultDiv.innerHTML = `
          <h3 style="color: red;">Erro ao criar rota:</h3>
          <pre>${JSON.stringify(result, null, 2)}</pre>
        `;
        }
      } catch (error) {
        document.getElementById("result").innerHTML = `
        <h3 style="color: red;">Erro:</h3>
        <p>${error.message}</p>
      `;
      }
    });
});
