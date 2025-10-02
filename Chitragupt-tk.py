import tkinter as tk
from tkinter import ttk, messagebox, font

# --- Data Store ---
# In a real app, this might load from a file (JSON, CSV) or a database.
inventory = {
    'Aata': 20000, 'Maida': 15000, 'Ghee': 10000,
    'Cheeni': 12000, 'Custard': 2000, 'Milk Powder': 1000
}

recipes = {
    'Aate Biscuit (62 pcs)': {
        'Aata': 6000, 'Maida': 6000, 'Ghee': 5500,
        'Cheeni': 5500, 'Custard': 500, 'Milk Powder': 200
    }
}

class ChitraguptApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Chitragupt - Desktop Inventory Manager")
        self.geometry("900x600")
        self.configure(bg="#F0F4F8")

        # --- Style Configuration ---
        self.style = ttk.Style(self)
        self.style.theme_use('clam')
        self.style.configure('TFrame', background='#F0F4F8')
        self.style.configure('TLabel', background='#F0F4F8', font=('Helvetica', 11))
        self.style.configure('Header.TLabel', font=('Helvetica', 18, 'bold'), foreground='#2c3e50')
        self.style.configure('TButton', font=('Helvetica', 10, 'bold'), padding=10)
        self.style.configure('Green.TButton', background='#27ae60', foreground='white')
        self.style.map('Green.TButton', background=[('active', '#2ecc71')])
        self.style.configure('Blue.TButton', background='#2980b9', foreground='white')
        self.style.map('Blue.TButton', background=[('active', '#3498db')])
        self.style.configure('Treeview.Heading', font=('Helvetica', 12, 'bold'))
        self.style.configure('Treeview', rowheight=25, font=('Helvetica', 10))

        # --- Main Layout ---
        main_frame = ttk.Frame(self, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Create two main columns
        main_frame.grid_columnconfigure(0, weight=1, minsize=300)
        main_frame.grid_columnconfigure(1, weight=2)
        main_frame.grid_rowconfigure(0, weight=1)

        control_panel = self._create_control_panel(main_frame)
        control_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 20))

        inventory_panel = self._create_inventory_panel(main_frame)
        inventory_panel.grid(row=0, column=1, sticky="nsew")
        
        # Populate initial data
        self.update_inventory_display()

    def _create_control_panel(self, parent):
        """Creates the left-side panel for actions."""
        panel = ttk.Frame(parent, padding="10")
        
        # --- Produce Section ---
        produce_frame = ttk.LabelFrame(panel, text="Produce Recipe", padding="15")
        produce_frame.pack(fill=tk.X, expand=True, pady=(0, 20))

        ttk.Label(produce_frame, text="Recipe:").grid(row=0, column=0, sticky="w", pady=5)
        self.recipe_var = tk.StringVar()
        recipe_options = list(recipes.keys())
        self.recipe_menu = ttk.Combobox(produce_frame, textvariable=self.recipe_var, values=recipe_options, state="readonly")
        if recipe_options:
            self.recipe_menu.current(0)
        self.recipe_menu.grid(row=0, column=1, sticky="ew", pady=5, padx=5)

        ttk.Label(produce_frame, text="Batches:").grid(row=1, column=0, sticky="w", pady=5)
        self.quantity_var = tk.IntVar(value=1)
        self.quantity_entry = ttk.Entry(produce_frame, textvariable=self.quantity_var, width=10)
        self.quantity_entry.grid(row=1, column=1, sticky="ew", pady=5, padx=5)
        
        produce_button = ttk.Button(produce_frame, text="Produce", command=self.produce_recipe, style="Blue.TButton")
        produce_button.grid(row=2, column=0, columnspan=2, pady=10, sticky="ew")

        # --- Add Stock Section ---
        add_stock_frame = ttk.LabelFrame(panel, text="Add Stock", padding="15")
        add_stock_frame.pack(fill=tk.X, expand=True)

        ttk.Label(add_stock_frame, text="Ingredient:").grid(row=0, column=0, sticky="w", pady=5)
        self.stock_ingredient_var = tk.StringVar()
        ingredient_options = list(inventory.keys())
        self.stock_ingredient_menu = ttk.Combobox(add_stock_frame, textvariable=self.stock_ingredient_var, values=ingredient_options, state="readonly")
        if ingredient_options:
            self.stock_ingredient_menu.current(0)
        self.stock_ingredient_menu.grid(row=0, column=1, sticky="ew", pady=5, padx=5)

        ttk.Label(add_stock_frame, text="Amount (g):").grid(row=1, column=0, sticky="w", pady=5)
        self.stock_amount_var = tk.IntVar(value=1000)
        self.stock_amount_entry = ttk.Entry(add_stock_frame, textvariable=self.stock_amount_var)
        self.stock_amount_entry.grid(row=1, column=1, sticky="ew", pady=5, padx=5)

        add_button = ttk.Button(add_stock_frame, text="Add to Stock", command=self.add_stock, style="Green.TButton")
        add_button.grid(row=2, column=0, columnspan=2, pady=10, sticky="ew")
        
        return panel

    def _create_inventory_panel(self, parent):
        """Creates the right-side panel for displaying inventory."""
        panel = ttk.Frame(parent, padding="10")
        panel.grid_rowconfigure(1, weight=1)
        panel.grid_columnconfigure(0, weight=1)

        ttk.Label(panel, text="Current Inventory", style="Header.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 10))

        cols = ("Ingredient", "Stock")
        self.inventory_tree = ttk.Treeview(panel, columns=cols, show='headings', selectmode="browse")
        
        # Define headings
        self.inventory_tree.heading("Ingredient", text="Ingredient")
        self.inventory_tree.heading("Stock", text="Stock Available")
        self.inventory_tree.column("Ingredient", anchor=tk.W, width=200)
        self.inventory_tree.column("Stock", anchor=tk.E, width=150)

        # Add scrollbar
        scrollbar = ttk.Scrollbar(panel, orient=tk.VERTICAL, command=self.inventory_tree.yview)
        self.inventory_tree.configure(yscroll=scrollbar.set)
        
        self.inventory_tree.grid(row=1, column=0, sticky="nsew")
        scrollbar.grid(row=1, column=1, sticky="ns")
        
        return panel

    def update_inventory_display(self):
        """Clears and re-populates the inventory treeview."""
        # Clear existing items
        for i in self.inventory_tree.get_children():
            self.inventory_tree.delete(i)
        
        # Add new items
        for ingredient, amount in sorted(inventory.items()):
            formatted_amount = f"{amount/1000:.2f} kg" if amount >= 1000 else f"{amount} g"
            self.inventory_tree.insert("", tk.END, values=(ingredient, formatted_amount))

    def produce_recipe(self):
        recipe_name = self.recipe_var.get()
        quantity = self.quantity_var.get()

        if not recipe_name or quantity <= 0:
            messagebox.showerror("Error", "Please select a recipe and enter a valid quantity.")
            return

        selected_recipe = recipes[recipe_name]
        can_produce = True
        missing_ingredients = []

        for ingredient, required in selected_recipe.items():
            total_required = required * quantity
            if inventory.get(ingredient, 0) < total_required:
                can_produce = False
                missing_amount = total_required - inventory.get(ingredient, 0)
                missing_ingredients.append(f"{ingredient} (missing {missing_amount}g)")

        if can_produce:
            for ingredient, required in selected_recipe.items():
                inventory[ingredient] -= required * quantity
            self.update_inventory_display()
            messagebox.showinfo("Success", f"Produced {quantity} batch(es) of {recipe_name}.")
        else:
            messagebox.showwarning("Stock Error", f"Not enough stock.\nMissing: {', '.join(missing_ingredients)}")

    def add_stock(self):
        ingredient = self.stock_ingredient_var.get()
        amount = self.stock_amount_var.get()

        if not ingredient or amount <= 0:
            messagebox.showerror("Error", "Please select an ingredient and enter a valid amount.")
            return

        inventory[ingredient] += amount
        self.update_inventory_display()
        messagebox.showinfo("Success", f"Added {amount}g of {ingredient} to stock.")


if __name__ == "__main__":
    app = ChitraguptApp()
    app.mainloop()
