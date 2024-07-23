// Event listener for the SPK Power Up button to open the modal
document.getElementById('powerUpButton').addEventListener('click', function() {
    document.getElementById('powerUpModal').style.display = 'block';
});

// Event listener for the available SPK balance to populate the input
document.getElementById('availableSPKBalance').addEventListener('click', function() {
    const balanceText = this.innerText;
    const balanceAmount = balanceText.split(' ')[0];
    document.getElementById('powerUpAmount').value = balanceAmount;
});

// Event listener for the Power Up form submission
document.getElementById('powerUpForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = localStorage.getItem('hive_username');
    const amount = document.getElementById('powerUpAmount').value;
    if (window.hive_keychain && username && amount) {
        const customJson = JSON.stringify({
            "amount": parseFloat(amount)
        });
        window.hive_keychain.requestBroadcast(
            username,
            [
                [
                    "custom_json",
                    {
                        "required_auths": [username],
                        "required_posting_auths": [],
                        "id": "spkccT_spk_up",
                        "json": customJson
                    }
                ]
            ],
            'Active',
            function(response) {
                console.log('Power Up transaction response:', response);
                if (response.success) {
                    alert('SPK Power Up successful!');
                } else {
                    alert('SPK Power Up failed: ' + response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or the amount is invalid.');
    }
    // Close the modal after submission
    document.getElementById('powerUpModal').style.display = 'none';
});

// Function to display the wallet content area
export function displayWallet() {
    const username = localStorage.getItem('hive_username');
    if (username) {
        // Fetch user's wallet balance from the blockchain or a database
        // For demonstration, we'll call a function that updates the wallet balance
        document.querySelector('.image-grid').style.display = 'none'; // Hide the image grid
        document.getElementById('walletContent').style.display = 'block';
        // Update the available SPK balance for the power up modal
        document.getElementById('availableSPKBalance').innerText = document.getElementById('spkBalance').innerText;
        const brocaBalance = document.getElementById('balance').innerText.split(':')[1].trim();
    } else {
        // If no username is found, display a message or redirect to login
        console.log('User is not logged in. Redirecting to login...');
        window.location.hash = '#login'; // Redirect to login page or display a message
    }
}
