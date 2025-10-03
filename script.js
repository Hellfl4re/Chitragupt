document.addEventListener('DOMContentLoaded', () => {

            // --- DATA STORE (STATE) ---
            // Data is loaded from an Excel file or uses this default sample.
            let inventory = {
                'Aata': 20000,
                'Maida': 15000,
                'Ghee': 10000,
                'Cheeni': 12000,
                'Custard': 2000,
                'Milk Powder': 1000
            };

            let recipes = {
                'Aate Biscuit (62 pcs)': {
                    'Aata': 6000,
                    'Maida': 6000,
                    'Ghee': 5500,
                    'Cheeni': 5500,
                    'Custard': 500,
                    'Milk Powder': 200
                }
            };

            // --- DOM ELEMENT REFERENCES ---
            const inventoryTableBody = document.getElementById('inventory-table-body');
            const recipeBookContainer = document.getElementById('recipe-book');
            const messageContainer = document.getElementById('message-container');
            const produceForm = document.getElementById('produce-form');
            const addStockForm = document.getElementById('add-stock-form');
            const recipeSelect = document.getElementById('recipe-select');
            const ingredientSelect = document.getElementById('ingredient-select');
            const excelFileInput = document.getElementById('excel-file-input');
            const saveDataButton = document.getElementById('save-data-button');

            // --- UTILITY FUNCTIONS ---
            const formatGrams = (g) => {
                if (g >= 1000) {
                    return `${(g / 1000).toFixed(2)} kg`;
                }
                return `${g} g`;
            };
            
            const showMessage = (message, type = 'info') => {
                const colorClasses = {
                    success: 'bg-green-100 text-green-800 border-green-500',
                    error: 'bg-red-100 text-red-800 border-red-500',
                    info: 'bg-blue-100 text-blue-800 border-blue-500'
                };
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert-fade-in p-4 rounded-lg shadow-md mb-3 border-l-4 ${colorClasses[type]}`;
                alertDiv.innerHTML = `<p class="font-semibold">${message}</p>`;
                messageContainer.prepend(alertDiv);

                setTimeout(() => {
                    alertDiv.style.opacity = '0';
                    alertDiv.style.transition = 'opacity 0.5s';
                    setTimeout(() => alertDiv.remove(), 500);
                }, 5000);
            };

            // --- RENDERING FUNCTIONS (Update the UI) ---
            const renderInventory = () => {
                inventoryTableBody.innerHTML = '';
                Object.entries(inventory).sort().forEach(([name, amount]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${formatGrams(amount)}</td>
                    `;
                    inventoryTableBody.appendChild(row);
                });
            };
            
            const renderRecipes = () => {
                const existingHeader = recipeBookContainer.querySelector('h2');
                recipeBookContainer.innerHTML = '';
                if (existingHeader) recipeBookContainer.appendChild(existingHeader);

                Object.entries(recipes).forEach(([name, ingredients]) => {
                    const recipeDiv = document.createElement('div');
                    recipeDiv.className = 'mb-4';
                    
                    let ingredientsHtml = '<ul class="list-disc list-inside mt-2 text-gray-600">';
                    Object.entries(ingredients).forEach(([ingredient, amount]) => {
                        ingredientsHtml += `<li>${ingredient}: ${formatGrams(amount)}</li>`;
                    });
                    ingredientsHtml += '</ul>';

                    recipeDiv.innerHTML = `
                        <h3 class="text-lg font-semibold text-indigo-700">${name}</h3>
                        ${ingredientsHtml}
                    `;
                    recipeBookContainer.appendChild(recipeDiv);
                });
            };
            
            const populateSelectOptions = () => {
                recipeSelect.innerHTML = '';
                Object.keys(recipes).forEach(name => {
                    const option = new Option(name, name);
                    recipeSelect.add(option);
                });

                ingredientSelect.innerHTML = '';
                const ingredients = Object.keys(inventory).length > 0 ? Object.keys(inventory) : ['Aata', 'Maida', 'Ghee', 'Cheeni', 'Custard', 'Milk Powder'];
                ingredients.sort().forEach(name => {
                    const option = new Option(name, name);
                    ingredientSelect.add(option);
                });
            };

            // --- EVENT HANDLERS ---
            const handleProduce = (event) => {
                event.preventDefault();
                const formData = new FormData(produceForm);
                const recipeName = formData.get('recipe');
                const quantity = parseInt(formData.get('quantity'), 10);
                
                if (!recipeName) {
                    showMessage('Please select a recipe to produce.', 'error');
                    return;
                }
                if (isNaN(quantity) || quantity <= 0) {
                    showMessage('Production quantity must be a positive number.', 'error');
                    return;
                }

                const selectedRecipe = recipes[recipeName];
                let canProduce = true;
                const missingIngredients = [];

                for (const [ingredient, requiredAmount] of Object.entries(selectedRecipe)) {
                    const totalRequired = requiredAmount * quantity;
                    if (!inventory[ingredient] || inventory[ingredient] < totalRequired) {
                        canProduce = false;
                        const missingAmount = totalRequired - (inventory[ingredient] || 0);
                        missingIngredients.push(`${ingredient} (missing ${formatGrams(missingAmount)})`);
                    }
                }

                if (canProduce) {
                    for (const [ingredient, requiredAmount] of Object.entries(selectedRecipe)) {
                        inventory[ingredient] -= requiredAmount * quantity;
                    }
                    showMessage(`Successfully produced ${quantity} batch(es) of ${recipeName}!`, 'success');
                    renderInventory();
                } else {
                    showMessage(`Not enough stock. Missing: ${missingIngredients.join(', ')}`, 'error');
                }
            };

            const handleAddStock = (event) => {
                event.preventDefault();
                const formData = new FormData(addStockForm);
                const ingredient = formData.get('ingredient');
                const amount = parseFloat(formData.get('amount'));

                if (isNaN(amount) || amount <= 0) {
                    showMessage('Stock amount must be a positive number.', 'error');
                    return;
                }

                if (!inventory[ingredient]) {
                    inventory[ingredient] = 0;
                }
                inventory[ingredient] += amount;
                showMessage(`Added ${formatGrams(amount)} of ${ingredient} to stock.`, 'success');
                addStockForm.reset();
                renderInventory();
                populateSelectOptions();
            };

            const handleFileLoad = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });

                        // Process Inventory (Sheet 1)
                        const inventorySheetName = workbook.SheetNames[0];
                        if (!inventorySheetName) throw new Error("Excel file must have at least one sheet for Inventory.");
                        const inventorySheet = workbook.Sheets[inventorySheetName];
                        const inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
                        
                        const newInventory = {};
                        inventoryData.forEach(item => {
                            const ingredientKey = Object.keys(item).find(k => k.toLowerCase().includes('ingredient'));
                            const stockKey = Object.keys(item).find(k => k.toLowerCase().includes('stock'));
                            if (ingredientKey && stockKey && item[ingredientKey] && item[stockKey] !== undefined && !isNaN(parseFloat(item[stockKey]))) {
                                newInventory[String(item[ingredientKey]).trim()] = parseFloat(item[stockKey]);
                            }
                        });
                        inventory = newInventory;

                        // Process Recipes (Sheet 2)
                        const newRecipes = {};
                        if (workbook.SheetNames.length > 1) {
                            const recipesSheetName = workbook.SheetNames[1];
                            const recipesSheet = workbook.Sheets[recipesSheetName];
                            const recipesData = XLSX.utils.sheet_to_json(recipesSheet);

                            recipesData.forEach(item => {
                                const recipeKey = Object.keys(item).find(k => k.toLowerCase().includes('recipe'));
                                const ingredientKey = Object.keys(item).find(k => k.toLowerCase().includes('ingredient'));
                                const amountKey = Object.keys(item).find(k => k.toLowerCase().includes('amount'));

                                if (recipeKey && ingredientKey && amountKey && item[recipeKey] && item[ingredientKey] && item[amountKey] !== undefined && !isNaN(parseFloat(item[amountKey]))) {
                                    const rName = String(item[recipeKey]).trim();
                                    const iName = String(item[ingredientKey]).trim();
                                    if (!newRecipes[rName]) newRecipes[rName] = {};
                                    newRecipes[rName][iName] = parseFloat(item[amountKey]);
                                }
                            });
                        }
                        recipes = newRecipes;

                        initUI();
                        showMessage('Successfully loaded data from Excel file!', 'success');
                    } catch (error) {
                        console.error("Error processing Excel file:", error);
                        showMessage(`Error reading file: ${error.message}. Please ensure file has 'Inventory' and 'Recipes' sheets with correct columns.`, 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            const handleSaveData = () => {
                try {
                    // Prepare Inventory data
                    const inventoryData = Object.entries(inventory).map(([name, stock]) => ({
                        'Ingredient': name,
                        'Stock (g)': stock
                    }));

                    // Prepare Recipes data
                    const recipesData = [];
                    Object.entries(recipes).forEach(([recipeName, ingredients]) => {
                        Object.entries(ingredients).forEach(([ingredient, amount]) => {
                            recipesData.push({
                                'Recipe Name': recipeName,
                                'Ingredient': ingredient,
                                'Amount (g)': amount
                            });
                        });
                    });

                    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData.length > 0 ? inventoryData : [{}]);
                    const recipesSheet = XLSX.utils.json_to_sheet(recipesData.length > 0 ? recipesData : [{}]);
                    
                    if (inventoryData.length === 0) XLSX.utils.sheet_add_aoa(inventorySheet, [['Ingredient', 'Stock (g)']], { origin: 'A1' });
                    if (recipesData.length === 0) XLSX.utils.sheet_add_aoa(recipesSheet, [['Recipe Name', 'Ingredient', 'Amount (g)']], { origin: 'A1' });

                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
                    XLSX.utils.book_append_sheet(workbook, recipesSheet, 'Recipes');

                    XLSX.writeFile(workbook, 'Chitragupt_Inventory.xlsx');

                    showMessage('Data saved successfully! Check your downloads.', 'success');
                } catch (error) {
                    console.error("Error saving data to Excel:", error);
                    showMessage(`Error saving file: ${error.message}`, 'error');
                }
            };

            // --- INITIALIZATION ---
            const initUI = () => {
                renderInventory();
                renderRecipes();
                populateSelectOptions();
            };

            const init = () => {
                // Set up event listeners
                produceForm.addEventListener('submit', handleProduce);
                addStockForm.addEventListener('submit', handleAddStock);
                excelFileInput.addEventListener('change', handleFileLoad);
                saveDataButton.addEventListener('click', handleSaveData);

                // Initial render
                initUI();
                showMessage("Welcome! Load an Excel file to start, or use the default sample data.", "info");
            };

            // Run the app
            init();
        });