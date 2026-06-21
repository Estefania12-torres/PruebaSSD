document.addEventListener('DOMContentLoaded', () => {
    const dbConnectionStringInput = document.getElementById('dbConnectionStringInput');
    const naturalQueryInput = document.getElementById('naturalQueryInput');
    const submitQueryBtn = document.getElementById('submitQueryBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsPanel = document.getElementById('resultsPanel');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const sqlCodeBlock = document.getElementById('sqlCodeBlock');
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');

    const API_URL = 'http://localhost:3000/api/v1/query';

    const showError = (message) => {
        errorMessage.textContent = message;
        errorBanner.classList.remove('hidden');
        setTimeout(() => {
            errorBanner.classList.add('hidden');
        }, 5000);
    };

    const hideError = () => {
        errorBanner.classList.add('hidden');
    };

    const renderTable = (data) => {
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%" class="p-4 text-center text-slate-500">No se encontraron resultados.</td></tr>';
            return;
        }

        const keys = Object.keys(data[0]);
        keys.forEach(key => {
            const th = document.createElement('th');
            th.className = 'px-4 py-3 font-semibold';
            th.textContent = key;
            tableHeader.appendChild(th);
        });

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/50 transition-colors';
            keys.forEach(key => {
                const td = document.createElement('td');
                td.className = 'px-4 py-3';
                td.textContent = row[key] === null ? 'NULL' : row[key];
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    };

    const handleQuery = async () => {
        const query = naturalQueryInput.value.trim();
        const connectionString = dbConnectionStringInput.value.trim();
        
        if (!query) {
            showError('Por favor, ingresa una consulta en lenguaje natural.');
            return;
        }

        if (!connectionString) {
            showError('Por favor, ingresa la cadena de conexión a la base de datos.');
            return;
        }

        hideError();
        submitQueryBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
        resultsPanel.classList.add('hidden');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    natural_query: query,
                    database_connection: connectionString
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                renderTable(result.data.results || []);
                sqlCodeBlock.textContent = result.data.sqlQuery || 'No se generó query SQL.';
                resultsPanel.classList.remove('hidden');
            } else {
                throw new Error('La respuesta del servidor no contiene los datos esperados.');
            }

        } catch (error) {
            console.error('API Error:', error);
            showError(error.message);
        } finally {
            submitQueryBtn.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    };

    submitQueryBtn.addEventListener('click', handleQuery);

    naturalQueryInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleQuery();
        }
    });
});
