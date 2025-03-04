// Variabel global untuk menu dan pesanan
let currentCategory = null;
let selectedItem = null;
let editingOrderIndex = null;  // Menandai index pesanan yang sedang diedit
let currentOrders = [];
let isCheckout = false; // Flag untuk mode checkout
const endpointURL = 'https://script.google.com/macros/s/AKfycbxgMT32p9A32mOHWKozlElT-66RCAEhNJfZHDlLNoRbV_1PrRySrEhV-nim-py9i0MWSg/exec';

// Inisialisasi menuItems sebagai objek kosong (akan diisi melalui API)
let menuItems = {
    asin: [],
    manis: []
};

// Fungsi untuk mengambil data menu dari Google Sheets melalui Google Apps Script
function fetchMenuItems() {
    fetch(endpointURL)
        .then(response => response.json())
        .then(data => {
            console.log("Fetched raw data:", data);
            if (!data || data.length === 0) {
                console.error("Data tidak ditemukan.");
                return;
            }
            // Karena data sudah berupa array objek, langsung filter berdasarkan kategori
            menuItems.asin = data.filter(item => String(item.category).toLowerCase() === 'asin');
            menuItems.manis = data.filter(item => String(item.category).toLowerCase() === 'manis');
            console.log("Menu asin:", menuItems.asin);
            console.log("Menu manis:", menuItems.manis);
        })
        .catch(err => console.error("Error fetching menu:", err));
}

// Fungsi untuk memulai pemesanan dari landing page
function startOrdering() {
    const landing = document.getElementById('landingContainer');
    landing.classList.add('fade-out');
    setTimeout(() => {
        landing.style.display = 'none';
        const mainContent = document.getElementById('mainContent');
        mainContent.style.display = 'block';
        mainContent.classList.add('fade-in');
    }, 800); // Durasi animasi fadeOut (0.8 detik)
}

// Fungsi untuk menampilkan menu berdasarkan kategori
function selectCategory(category) {
    currentCategory = category;
    document.getElementById('categorySelection').style.display = 'none';
    document.getElementById('menuSection').style.display = 'block';
    document.getElementById('menuTitle').textContent = `Menu ${category === 'asin' ? 'Makanan Asin' : 'Makanan Manis'}`;
    
    // Sembunyikan gambar dekorasi saat kategori dipilih
    document.getElementById('sideImage').style.display = 'none';
    
    const menuContainer = document.getElementById('menuItems');
    menuContainer.innerHTML = '';
    
    menuItems[category].forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        // Jika stok habis, tambahkan kelas 'out-of-stock' dan jangan assign onclick
        if (Number(item.stock) <= 0) {
            menuItem.classList.add('out-of-stock');
        } else {
            menuItem.onclick = () => showOrderModal(item);
        }
        
        menuItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="menu-image">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <p class="price">Rp ${Number(item.price).toLocaleString()}</p>
            <p class="stock">Stok: ${item.stock}</p>
        `;
        menuContainer.appendChild(menuItem);
    });
}

// Fungsi untuk kembali ke kategori
function goBackToCategories() {
    document.getElementById('categorySelection').style.display = 'flex';
    document.getElementById('menuSection').style.display = 'none';
    currentCategory = null;
    document.getElementById('sideImage').style.display = 'block';
}

// Fungsi untuk menampilkan modal pesanan
function showOrderModal(item) {
    editingOrderIndex = null;  // Reset mode edit
    selectedItem = item;
    document.getElementById('orderModal').style.display = 'flex';
    document.getElementById('modalItemName').textContent = item.name;
    document.getElementById('modalPrice').textContent = `Rp ${Number(item.price).toLocaleString()}`;
    document.getElementById('quantity').value = 1;
    
    // Tampilkan stok di modal
    document.getElementById('modalStock').textContent = "Stok: " + item.stock;
    
    // Jika stok habis, nonaktifkan tombol add-to-cart
    if (Number(item.stock) <= 0) {
        document.querySelector('.add-to-cart').disabled = true;
        document.querySelector('.add-to-cart').textContent = "Stok Habis";
    } else {
        document.querySelector('.add-to-cart').disabled = false;
        updateModalButtonText();
    }
}

// Fungsi untuk mengedit pesanan yang sudah ada
function editOrder(index) {
    editingOrderIndex = index;
    const order = currentOrders[index];
    selectedItem = order.item;
    document.getElementById('orderModal').style.display = 'flex';
    document.getElementById('modalItemName').textContent = order.item.name;
    document.getElementById('modalPrice').textContent = `Rp ${Number(order.item.price).toLocaleString()}`;
    document.getElementById('quantity').value = order.quantity;
    document.getElementById('modalStock').textContent = "Stok: " + order.item.stock;
    updateModalButtonText();
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
    selectedItem = null;
    editingOrderIndex = null;
}

function adjustQuantity(change) {
    const quantityInput = document.getElementById('quantity');
    let newValue = parseInt(quantityInput.value) + change;
    // Pastikan jumlah tidak melebihi stok yang tersedia
    if (selectedItem && newValue > Number(selectedItem.stock)) {
        newValue = Number(selectedItem.stock);
    }
    if (newValue < 0) newValue = 0;
    quantityInput.value = newValue;
    updateModalButtonText();
}

// Fungsi untuk memperbarui teks tombol pada modal berdasarkan kuantitas dan mode edit
function updateModalButtonText() {
    const quantity = parseInt(document.getElementById('quantity').value);
    const btn = document.querySelector('.add-to-cart');
    if (editingOrderIndex !== null) {
        btn.textContent = (quantity === 0) ? 'Hapus Pesanan' : 'Ubah Jumlah Pesanan';
    } else {
        btn.textContent = 'Tambahkan ke Pesanan';
    }
}

document.getElementById('quantity').addEventListener('input', updateModalButtonText);

function addToCart() {
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (quantity > Number(selectedItem.stock)) {
        alert("Jumlah pesanan melebihi stok yang tersedia!");
        return;
    }
    
    if (quantity === 0) {
        if (editingOrderIndex !== null) {
            currentOrders.splice(editingOrderIndex, 1);
        }
    } else {
        if (editingOrderIndex !== null) {
            currentOrders[editingOrderIndex].quantity = quantity;
        } else {
            const existingOrder = currentOrders.find(order => order.item.id === selectedItem.id);
            if (existingOrder) {
                if (existingOrder.quantity + quantity > Number(selectedItem.stock)) {
                    alert("Total pesanan melebihi stok yang tersedia!");
                    return;
                }
                existingOrder.quantity += quantity;
            } else {
                currentOrders.push({
                    item: selectedItem,
                    quantity: quantity
                });
            }
        }
    }
    
    editingOrderIndex = null;
    updateTotal();
    populateCheckout();
    closeModal();
}

function updateTotal() {
    let total = 0;
    currentOrders.forEach(order => {
        total += Number(order.item.price) * order.quantity;
    });
    document.getElementById('totalAmount').textContent = `Rp ${total.toLocaleString()}`;
    document.getElementById('checkoutTotal').textContent = `Rp ${total.toLocaleString()}`;
    
    if (isCheckout) {
        document.getElementById('totalContainer').style.display = 'none';
    } else {
        document.getElementById('totalContainer').style.display = (total > 0) ? 'flex' : 'none';
    }
    
    if (total === 0 && isCheckout) {
        isCheckout = false;
        document.getElementById('checkoutSection').style.display = 'none';
        document.getElementById('categorySelection').style.display = 'flex';
        document.getElementById('menuSection').style.display = 'none';
        document.getElementById('sideImage').style.display = 'block';
    }
}

function checkout() {
    if (currentOrders.length === 0) {
        alert('Silahkan pilih menu terlebih dahulu!');
        return;
    }
    isCheckout = true;
    document.getElementById('totalContainer').style.display = 'none';
    document.getElementById('menuSection').style.display = 'none';
    document.getElementById('checkoutSection').style.display = 'block';
    populateCheckout();
    document.getElementById('checkoutSection').scrollIntoView({ behavior: 'smooth' });
}

function populateCheckout() {
    const summaryContainer = document.getElementById('orderSummary');
    summaryContainer.innerHTML = '';
    currentOrders.forEach((order, index) => {
       const orderDiv = document.createElement('div');
       orderDiv.className = 'order-item';
       orderDiv.innerHTML = `
           <div class="order-info">
               <span class="order-name">${order.item.name} x ${order.quantity}</span>
           </div>
           <div class="order-price">
               <span>Rp ${(Number(order.item.price) * order.quantity).toLocaleString()}</span>
           </div>
           <button class="edit-order-btn" onclick="editOrder(${index})">Edit</button>
       `;
       summaryContainer.appendChild(orderDiv);
    });
    updateTotal();
}

function goBackFromCheckout() {
    document.getElementById('checkoutSection').style.display = 'none';
    document.getElementById('menuSection').style.display = 'block';
    isCheckout = false;
}

function showPaymentForm() {
    document.getElementById("paymentMethodBtn").style.display = "none";
    document.getElementById("paymentForm").style.display = "block";
    document.getElementById("paymentForm").scrollIntoView({ behavior: "smooth" });
}

function toggleTransferFields() {
    var paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    if(paymentMethod === "Transfer") {
        document.getElementById("transferFields").style.display = "block";
        document.getElementById("proofUpload").required = true;
    } else {
        document.getElementById("transferFields").style.display = "none";
        document.getElementById("proofUpload").required = false;
    }
}

document.getElementById("paymentDetailsForm").addEventListener("submit", function(e) {
    e.preventDefault();
    
    var errorContainer = document.getElementById("paymentErrors");
    errorContainer.innerHTML = "";
    
    var nameInput = document.getElementById("customerName").value.trim();
    var phoneInput = document.getElementById("customerWhatsapp").value.trim();
    var addressInput = document.getElementById("customerAddress").value.trim();
    var dateInput = document.getElementById("orderDate").value;
    var paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    var errors = [];
    
    if (nameInput.length < 3) {
        errors.push("Nama harus terdiri dari minimal 3 karakter.");
    }
    
    var phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phoneInput)) {
        errors.push("Nomor Whatsapp harus berupa angka dan terdiri dari minimal 10 digit.");
    }
    
    if (addressInput.length < 5) {
        errors.push("Alamat harus terdiri dari minimal 5 karakter.");
    }
    
    if (!dateInput) {
        errors.push("Silakan isi tanggal untuk pre-order.");
    } else {
        var selectedDate = new Date(dateInput);
        var today = new Date();
        var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        if (selectedDate < tomorrow) {
            errors.push("Tanggal minimal untuk pre-order adalah besok.");
        }
    }
    
    if (errors.length > 0) {
        errorContainer.innerHTML = errors.join("<br>");
        errorContainer.scrollIntoView({ behavior: "smooth" });
        return;
    }
    
    const orderData = {
        customerName: nameInput,
        customerWhatsapp: phoneInput,
        customerAddress: addressInput,
        orderDate: dateInput,
        paymentMethod: paymentMethod,  // Misalnya "COD" atau "Transfer"
        proofTransfer: "NaN",
        orders: currentOrders
    };
    
    if(paymentMethod === "Transfer") {
        var fileInput = document.getElementById("proofUpload");
        if(fileInput.files.length > 0) {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(evt) {
                orderData.proofTransfer = evt.target.result;
                console.log("Order Data dengan bukti transfer:", orderData);
                submitOrder(orderData);
            };
            reader.onerror = function(error) {
                console.error("Error membaca file:", error);
                alert("Gagal membaca file bukti transfer.");
            };
            reader.readAsDataURL(file);
        } else {
            orderData.proofTransfer = "NaN";
            submitOrder(orderData);
        }
    } else {
        console.log("Order Data:", orderData);
        submitOrder(orderData);
    }
    
    
    // Jika validasi berhasil, sembunyikan bagian checkout dan tampilkan pesan konfirmasi
    document.getElementById("checkoutSection").innerHTML = "<p style='color: green; text-align: center; font-size: 1.5em; margin: 20px 0;'>Pesanan Anda telah dikonfirmasi!</p>";
});

function submitOrder(orderData) {
    // Ganti URL di bawah dengan URL deployment web app Anda
    fetch(endpointURL, {
        method: 'POST',
        mode: 'no-cors', // nonaktifkan CORS
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })
      .catch(err => console.error('Error submitting order:', err));
      
}
  
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeModal();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    flatpickr("#orderDate", {
        altInput: true,
        altFormat: "F j, Y",
        dateFormat: "Y-m-d",
        minDate: "today",
        allowInput: false,
        onReady: function(selectedDates, dateStr, instance) {
            instance.altInput.setAttribute("readonly", "readonly");
        }
    });    
    fetchMenuItems();
});
