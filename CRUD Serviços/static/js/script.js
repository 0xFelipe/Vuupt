// static/js/script.js
document.addEventListener("DOMContentLoaded", function () {
  // Elementos do formulário
  const form = document.getElementById("serviceForm");
  const customerTypeRadios = document.querySelectorAll(
    'input[name="customerType"]'
  );
  const existingCustomerSection = document.getElementById(
    "existingCustomerSection"
  );
  const newCustomerSection = document.getElementById("newCustomerSection");
  const assignDriverCheckbox = document.getElementById("assignDriver");
  const driverSection = document.getElementById("driverSection");
  const sameAddressCheckbox = document.getElementById("sameAddress");
  const customerAddressSection = document.getElementById(
    "customerAddressSection"
  );
  const geocodeBtn = document.getElementById("btnGeocode");
  const useClientAddressCheckbox = document.getElementById("useClientAddress");
  const serviceAddressSection = document.getElementById(
    "serviceAddressSection"
  );

  // Elementos para geocodificação
  const addressInput = document.getElementById("address");
  const latitudeDisplay = document.getElementById("latitudeDisplay");
  const longitudeDisplay = document.getElementById("longitudeDisplay");
  const latitudeSpan = document.getElementById("latitude");
  const longitudeSpan = document.getElementById("longitude");

  // Cache para dados de clientes
  let clientsData = [];

  // Carregar clientes ao iniciar
  loadCustomers();

  //Botão de recarregar clientes
  const reloadBtn = document.getElementById("reloadCustomers");
  reloadBtn.addEventListener("click", function () {
    loadCustomers();
  });

  // Evento para alternar entre cliente existente e novo cliente
  customerTypeRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (this.value === "existing") {
        existingCustomerSection.style.display = "block";
        newCustomerSection.style.display = "none";

        // Mostrar opção de usar endereço do cliente somente quando é cliente existente
        document.getElementById("useClientAddressWrapper").style.display =
          "block";
      } else {
        existingCustomerSection.style.display = "none";
        newCustomerSection.style.display = "block";

        // Esconder opção de usar endereço do cliente e resetar quando for cliente novo
        document.getElementById("useClientAddressWrapper").style.display =
          "none";
        useClientAddressCheckbox.checked = false;
        serviceAddressSection.style.display = "block";
      }
    });
  });

  // Evento para usar endereço cadastrado do cliente
  useClientAddressCheckbox.addEventListener("change", function () {
    if (this.checked) {
      // Ocultar campos de endereço do serviço e geocodificação
      serviceAddressSection.style.display = "none";

      // Tentar preencher automaticamente a latitude e longitude com os dados do cliente
      const selectedClientId = document.getElementById("customerId").value;
      const selectedClient = clientsData.find(
        (client) =>
          client.id === selectedClientId || client.code === selectedClientId
      );

      if (
        selectedClient &&
        selectedClient.latitude &&
        selectedClient.longitude
      ) {
        // Se o cliente tem coordenadas cadastradas, usar essas
        latitudeSpan.textContent = selectedClient.latitude;
        longitudeSpan.textContent = selectedClient.longitude;
        latitudeDisplay.style.display = "inline";
        longitudeDisplay.style.display = "inline";
      } else {
        // Se não tem coordenadas, limpar os campos de latitude e longitude
        latitudeSpan.textContent = "";
        longitudeSpan.textContent = "";
        latitudeDisplay.style.display = "none";
        longitudeDisplay.style.display = "none";
      }
    } else {
      // Mostrar campos de endereço do serviço e geocodificação
      serviceAddressSection.style.display = "block";

      // Limpar latitude e longitude
      latitudeSpan.textContent = "";
      longitudeSpan.textContent = "";
      latitudeDisplay.style.display = "none";
      longitudeDisplay.style.display = "none";
    }
  });

  // Evento ao mudar o cliente selecionado
  document.getElementById("customerId").addEventListener("change", function () {
    // Se estiver usando endereço do cliente, atualizar as coordenadas
    if (useClientAddressCheckbox.checked) {
      const selectedClientId = this.value;
      const selectedClient = clientsData.find(
        (client) =>
          client.id === selectedClientId || client.code === selectedClientId
      );

      if (
        selectedClient &&
        selectedClient.latitude &&
        selectedClient.longitude
      ) {
        latitudeSpan.textContent = selectedClient.latitude;
        longitudeSpan.textContent = selectedClient.longitude;
        latitudeDisplay.style.display = "inline";
        longitudeDisplay.style.display = "inline";
      } else {
        latitudeSpan.textContent = "";
        longitudeSpan.textContent = "";
        latitudeDisplay.style.display = "none";
        longitudeDisplay.style.display = "none";
      }
    }
  });

  // Evento para mostrar/ocultar seção de motorista
  assignDriverCheckbox.addEventListener("change", function () {
    if (this.checked) {
      driverSection.style.display = "block";
      loadDrivers();
    } else {
      driverSection.style.display = "none";
    }
  });

  // Evento para usar o mesmo endereço do serviço
  sameAddressCheckbox.addEventListener("change", function () {
    if (this.checked) {
      document.getElementById("customerAddress").value = addressInput.value;
      customerAddressSection.style.display = "none";
    } else {
      customerAddressSection.style.display = "block";
    }
  });

  // Evento para geocodificar endereço
  geocodeBtn.addEventListener("click", async function () {
    const address = addressInput.value;
    if (!address) {
      alert("Por favor, insira um endereço para geocodificar.");
      return;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(`/api/geocode/${encodedAddress}`);
      if (!response.ok) {
        throw new Error("Erro ao geocodificar endereço");
      }

      const data = await response.json();
      if (data && data.latitude && data.longitude) {
        latitudeSpan.textContent = data.latitude;
        longitudeSpan.textContent = data.longitude;
        latitudeDisplay.style.display = "inline";
        longitudeDisplay.style.display = "inline";
      } else {
        alert("Não foi possível obter as coordenadas para este endereço.");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao geocodificar endereço: " + error.message);
    }
  });

  // Evento para o envio do formulário
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Verificar se está usando o endereço do cliente ou endereço personalizado
    const isUsingClientAddress =
      document.getElementById("useClientAddress").checked &&
      document.querySelector('input[name="customerType"]:checked').value ===
        "existing";

    // Validar se o endereço foi geocodificado quando não estiver usando endereço do cliente
    if (
      !isUsingClientAddress &&
      (!latitudeSpan.textContent || !longitudeSpan.textContent)
    ) {
      alert("Por favor, geocodifique o endereço antes de enviar.");
      return;
    }

    // Preparar os dados do serviço
    const serviceData = {
      code: document.getElementById("code").value,
      title: document.getElementById("title").value,
      note: document.getElementById("note").value,
      type: document.getElementById("type").value,
      upsert: true,
    };

    // Verificar tipo de cliente (existente ou novo)
    const customerType = document.querySelector(
      'input[name="customerType"]:checked'
    ).value;

    if (customerType === "existing") {
      const customerId = document.getElementById("customerId").value;
      if (!customerId) {
        alert("Por favor, selecione um cliente.");
        return;
      }

      serviceData.customer_id = customerId;

      // Se estiver usando o endereço do cliente
      if (isUsingClientAddress) {
        // Encontrar cliente selecionado para pegar seu endereço e coordenadas
        const selectedClient = clientsData.find(
          (client) => client.id === customerId || client.code === customerId
        );

        if (selectedClient) {
          serviceData.address = selectedClient.address || "";

          // Se o cliente tiver coordenadas cadastradas
          if (selectedClient.latitude && selectedClient.longitude) {
            serviceData.latitude = parseFloat(selectedClient.latitude);
            serviceData.longitude = parseFloat(selectedClient.longitude);
          } else {
            alert(
              "O cliente selecionado não tem coordenadas cadastradas. Por favor, desmarque a opção 'Utilizar endereço cadastrado do cliente' e informe um endereço para o serviço."
            );
            return;
          }
        } else {
          alert("Não foi possível obter os dados do cliente selecionado.");
          return;
        }
      } else {
        // Usando endereço personalizado
        serviceData.address = addressInput.value;
        serviceData.latitude = parseFloat(latitudeSpan.textContent);
        serviceData.longitude = parseFloat(longitudeSpan.textContent);
      }
    } else {
      // Cliente novo
      serviceData.customer = {
        name: document.getElementById("customerName").value,
        email: document.getElementById("customerEmail").value,
        phone_number: document.getElementById("customerPhone").value,
        upsert: true,
      };

      // Usando endereço personalizado para o serviço
      serviceData.address = addressInput.value;
      serviceData.latitude = parseFloat(latitudeSpan.textContent);
      serviceData.longitude = parseFloat(longitudeSpan.textContent);

      // Verificar se usa o mesmo endereço ou um endereço próprio para o cliente
      if (sameAddressCheckbox.checked) {
        serviceData.customer.address = addressInput.value;
      } else {
        serviceData.customer.address =
          document.getElementById("customerAddress").value;
      }

      // Adicionar complemento se existir
      const complement = document.getElementById("addressComplement").value;
      if (complement) {
        serviceData.customer.address_complement = complement;
      }
    }

    // Verificar se deve atribuir a um motorista
    if (assignDriverCheckbox.checked) {
      const driverId = document.getElementById("driverId").value;
      if (driverId) {
        serviceData.driver_id = driverId;
      }
    }

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      const result = await response.json();

      // Mostrar resultado em um modal
      const resultModalBody = document.getElementById("resultModalBody");
      if (response.ok) {
        resultModalBody.innerHTML = `
  <div class="alert alert-success">Serviço cadastrado com sucesso!</div>
  <pre>${JSON.stringify(result, null, 2)}</pre>
  <div class="text-end mt-3">
    <button id="btnNovoServico" class="btn btn-primary">Novo Serviço</button>
  </div>
`;

        // Adiciona o event listener assim que o botão for inserido no DOM
        document
          .getElementById("btnNovoServico")
          .addEventListener("click", () => {
            // Fechar o modal
            const modalElement = document.getElementById("resultModal");
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();

            // Limpar os campos do formulário
            form.reset();

            // Resetar campos de latitude e longitude
            latitudeSpan.textContent = "";
            longitudeSpan.textContent = "";
            latitudeDisplay.style.display = "none";
            longitudeDisplay.style.display = "none";

            // Reexibir seção correta do cliente
            existingCustomerSection.style.display = "block";
            newCustomerSection.style.display = "none";

            // Ocultar seção de motorista e endereço adicional
            driverSection.style.display = "none";
            customerAddressSection.style.display = "block";
            serviceAddressSection.style.display = "block";

            // Mostrar opção de usar endereço do cliente
            document.getElementById("useClientAddressWrapper").style.display =
              "block";

            // Restaurar foco no campo de código
            document.getElementById("code").focus();
          });
      } else {
        resultModalBody.innerHTML = `
                    <div class="alert alert-danger">Erro ao cadastrar serviço</div>
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                `;
      }

      // Exibir o modal
      new bootstrap.Modal(document.getElementById("resultModal")).show();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao enviar formulário: " + error.message);
    }
  });

  // Função para carregar clientes
  async function loadCustomers() {
    try {
      // Usa a rota do backend que fará a proxy para a API externa
      const response = await fetch("/api/contatos");
      if (!response.ok) {
        throw new Error("Erro ao buscar clientes");
      }

      const data = await response.json();
      const customerSelect = document.getElementById("customerId");
      customerSelect.innerHTML = ""; // Limpar opções existentes

      // Verifica se a resposta é um array ou tem uma propriedade data
      const customers = Array.isArray(data) ? data : data.data || [];

      // Armazenar dados dos clientes para uso posterior
      clientsData = customers;

      if (customers && customers.length > 0) {
        customers.forEach((customer) => {
          const option = document.createElement("option");
          option.value = customer.id || customer.code;
          option.textContent = `${customer.id || customer.code} - ${
            customer.name
          }- ${customer.address || "Sem endereço"}`;
          customerSelect.appendChild(option);
        });
      } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Nenhum cliente encontrado";
        customerSelect.appendChild(option);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      const customerSelect = document.getElementById("customerId");
      customerSelect.innerHTML =
        '<option value="">Erro ao carregar clientes</option>';
    }
  }

  // Função para carregar motoristas
  async function loadDrivers() {
    try {
      // Usa a rota do backend que fará a proxy para a API externa
      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error("Erro ao buscar motoristas");
      }

      const data = await response.json();
      const driverSelect = document.getElementById("driverId");
      driverSelect.innerHTML = ""; // Limpar opções existentes

      //Botão de recarregar motoristas
      const reloadBtn = document.getElementById("reloadDrivers");
      reloadBtn.addEventListener("click", function () {
        loadDrivers();
      });

      // Verifica se a resposta é um array ou tem uma propriedade data
      const drivers = Array.isArray(data) ? data : data.data || [];

      if (drivers && drivers.length > 0) {
        drivers.forEach((driver) => {
          const option = document.createElement("option");
          option.value = driver.id || driver.code; // Alguns APIs usam code em vez de id
          option.textContent = `${driver.id || driver.code} - ${driver.name}`;
          driverSelect.appendChild(option);
        });
      } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Nenhum motorista encontrado";
        driverSelect.appendChild(option);
      }
    } catch (error) {
      console.error("Erro ao carregar motoristas:", error);
      const driverSelect = document.getElementById("driverId");
      driverSelect.innerHTML =
        '<option value="">Erro ao carregar motoristas</option>';
    }
  }
});
