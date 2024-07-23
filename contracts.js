// Event listener for the new file button to open the new file modal
document.getElementById('newButton').addEventListener('click', function() {
    document.getElementById('newFileModal').style.display = 'block';
    fetchServiceProviders();
    fetchChannels();
});

// Event listener for the "Next" button on Step 1 to go to Step 2
document.getElementById('nextToStep2').addEventListener('click', function() {
    document.querySelector('.modal-step').style.display = 'none'; // Hide Step 1
    document.getElementById('step2').style.display = 'block'; // Show Step 2
    document.querySelector('.modal-steps-header .active').classList.remove('active'); // Remove active class from Step 1 tab
    document.querySelectorAll('.modal-step-tab')[1].classList.add('active'); // Add active class to Step 2 tab
});

// Event listener for the "Next" button on Step 1 to go to Step 2
document.getElementById('nextToStep3').addEventListener('click', function() {
    document.getElementById('step2').style.display = 'none'; // Hide Step 2
    document.getElementById('step3').style.display = 'block'; // Show Step 3
    document.querySelector('.modal-steps-header .active').classList.remove('active'); // Remove active class from Step 1 tab
    document.querySelectorAll('.modal-step-tab')[2].classList.add('active'); // Add active class to Step 2 tab
});

// Event listener for closing the new file modal when clicking on the close button
document.querySelectorAll('.modal .close').forEach(function(closeButton) {
    closeButton.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

// Event listener for closing the new file modal when clicking outside of it
window.addEventListener('click', function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
    }
});

// TODO: Implement the form submission logic for uploading files and selecting service provider
document.getElementById('createContractButton').addEventListener('click', function () {
    event.preventDefault();
    const username = localStorage.getItem('hive_username'); // Fetch the username from localStorage
    const serviceProvider = document.getElementById('serviceProvider').value;
    const cost = document.getElementById('newFileForm').getAttribute('data-cost'); // Retrieve the cost from the form attribute
    if (window.hive_keychain && typeof window.hive_keychain.requestBroadcast === 'function') {
        const operations = [
            [
                "custom_json",
                {
                    "required_auths": [username],
                    "required_posting_auths": [],
                    "id": "spkccT_channel_open",
                    "json": JSON.stringify({
                        "broca": cost, // Dynamic value based on the actual cost
                        "broker": serviceProvider,
                        "to": username,
                        "contract": "0" // This value might need to be dynamic or based on some logic
                    })
                }
            ]
        ];
        window.hive_keychain.requestBroadcast(
            username,
            operations,
            'Active', // Use 'Active' key because this is a custom_json operation
            function (response) {
                console.log('Broadcast transaction response:', response);
                if (response.success) {
                    // Handle success, update UI accordingly
                    // Start polling for new channels
                    const statusBar = document.getElementById('statusBar');
                    const statusMessage = document.getElementById('statusMessage');
                    statusBar.style.display = 'block'; // Show the status bar
                    statusMessage.textContent = 'Contract created. Looking for open channels...'; // Update status message
                    pollForNewChannels(username);
                } else {
                    // Handle error, update UI accordingly
                }
            },
            'Channel Open' // A message to describe the operation
        );
    } else {
        alert('Hive Keychain is not installed');
    }
});

// Function to poll for new channels until one is found open
export function pollForNewChannels(username) {
    const statusBar = document.getElementById('statusBar');
    const statusMessage = document.getElementById('statusMessage');
    statusBar.style.display = 'block'; // Show the status bar
    statusMessage.textContent = 'Looking for open channels...'; // Initial status message
    statusBar.style.display = 'block'; // Show the status bar with spinner
    const pollInterval = 5000; // Poll every 5 seconds
    const maxAttempts = 12; // Try for 1 minute
    let attempts = 0;

    const poll = () => {
        if (attempts < maxAttempts) {
            fetchChannels();
            const channelsList = document.getElementById('channelsList');
            if (channelsList.children.length > 0) {
                // If new channels are found, stop polling and hide the status bar
                statusBar.style.display = 'none';
                statusBar.style.display = 'none'; // Hide the status bar with spinner
                return;
            }
            attempts++;
            statusMessage.textContent = `Creating Contract... (${attempts}/${maxAttempts})`; // Update status message
            setTimeout(poll, pollInterval);
        } else {
            statusMessage.textContent = 'No open channels found after 1 minute.';
            alert('No open contract found after 1 minute please try again.');
            statusBar.style.display = 'none'; // Hide the status bar
        }
    };

    poll(); // Start polling
}

// Function to fetch channels and update the modal with checkboxes
function fetchChannels() {
    const username = localStorage.getItem('hive_username');
    if (username) {
        const apiUrl = `https://spk.nathansenn.spk.tv/@${username}`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                const channels = data.channels;
                const channelsList = document.getElementById('channelsList');
                channelsList.innerHTML = ''; // Clear existing channels
                document.getElementById('nextToStep3').style.display = 'none'; // Initially hide the "Next" button
                document.getElementById('createContractButton').style.display = 'block'; // Initially show the "Create Contract" button
                for (const channelOwner in channels) {
                    for (const channelId in channels[channelOwner]) {
                        const channel = channels[channelOwner][channelId];
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.id = channel.i;
                        radio.name = 'channelSelection'; // All radios share the same name
                        radio.value = channel.i;

                        const label = document.createElement('label');
                        label.htmlFor = channel.i;
                        label.appendChild(document.createTextNode(` ${channelOwner}/${channelId} (${channel.i})`));
                        const listItem = document.createElement('li');
                        listItem.appendChild(radio);
                        listItem.appendChild(label);

                        // Update the form's data-selected-channel attribute when a channel is selected
                        radio.addEventListener('change', function() {
                            document.getElementById('newFileForm').setAttribute('data-selected-channel', this.value);
                            document.getElementById('nextToStep3').style.display = 'block'; // Show the "Next" button
                            document.getElementById('createContractButton').style.display = 'none'; // Hide the "Create Contract" button
                        });

                        channelsList.appendChild(listItem);

                        // Set the first channel as the default selected channel
                        if (channelsList.childElementCount === 1) {
                            radio.checked = true;
                            document.getElementById('newFileForm').setAttribute('data-selected-channel', radio.value);
                            document.getElementById('nextToStep3').style.display = 'block'; // Show the "Next" button
                            document.getElementById('createContractButton').style.display = 'none'; // Hide the "Create Contract" button
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching channels:', error);
            });
    } else {
        // If no username is found, clear the selected channel data attribute
        const newFileForm = document.getElementById('newFileForm');
        if (newFileForm) newFileForm.removeAttribute('data-selected-channel');
        document.getElementById('nextToStep3').style.display = 'none'; // Hide the "Next" button
        document.getElementById('createContractButton').style.display = 'block'; // Show the "Create Contract" button
    }
}

// Function to fetch service providers and update the select element
function fetchServiceProviders() {
    const apiUrl = 'https://spk.nathansenn.spk.tv/services/IPFS';

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const providers = data.providers;
            const serviceProviderSelect = document.getElementById('serviceProvider');
            serviceProviderSelect.innerHTML = ''; // Clear existing options
            for (const providerName in providers) {
                const option = document.createElement('option');
                option.value = providerName;
                option.textContent = providerName;
                serviceProviderSelect.appendChild(option);
            }
        })
        .catch(error => {
            console.error('Error fetching service providers:', error);
        });
}

// Function to store the selected file on the blockchain
export function storeFileOnBlockchain() {
    const username = localStorage.getItem('hive_username');
    const contractId = document.getElementById('extendStoreModal').dataset.contractId; // Retrieve the contract ID from the modal's data attribute
    if (username && contractId && window.hive_keychain) {
        const operations = [
            [
                "custom_json",
                {
                    "required_auths": [username],
                    "required_posting_auths": [],
                    "id": "spkccT_store",
                    "json": JSON.stringify({
                        "items": [contractId] // Use the contract ID directly
                    })
                }
            ]
        ];
        window.hive_keychain.requestBroadcast(
            username,
            operations,
            'Active',
            function(response) {
                console.log('Store operation broadcast response:', response);
                if (response.success) {
                    // Handle success, update UI accordingly
                    alert('File storage request successfully broadcasted to the blockchain.');
                } else {
                    // Handle error, update UI accordingly
                    alert('Failed to broadcast file storage request: ' + response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or the contract ID is missing.');
    }
}

// Function to store selected files on the blockchain
export function storeSelectedFilesOnBlockchain() {
    const username = localStorage.getItem('hive_username');
    const selectedCheckboxes = document.querySelectorAll('.image-checkbox:checked');
    const contractIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.closest('.image-placeholder').dataset.contractId);
    if (username && contractIds.length && window.hive_keychain) {
        const operations = [
            [
                "custom_json",
                {
                    "required_auths": [username],
                    "required_posting_auths": [],
                    "id": "spkccT_store",
                    "json": JSON.stringify({
                        "items": contractIds // Use the array of selected contract IDs
                    })
                }
            ]
        ];
        window.hive_keychain.requestBroadcast(
            username,
            operations,
            'Active',
            function(response) {
                console.log('Store operation broadcast response:', response);
                if (response.success) {
                    // Handle success, update UI accordingly
                    alert('File storage request for selected files successfully broadcasted to the blockchain.');
                } else {
                    // Handle error, update UI accordingly
                    alert('Failed to broadcast file storage request: ' + response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or no files are selected.');
    }
}

// Function to extend the contract duration on the blockchain
export function extendContractOnBlockchain() {
    const username = localStorage.getItem('hive_username');
    const extendModal = document.getElementById('extendStoreModal');
    const contractId = extendModal.dataset.contractId; // Retrieve the contract ID from the modal's data attribute
    const cost = document.getElementById('extendDurationForm').getAttribute('data-cost'); // Retrieve the cost from the form attribute
    if (username && contractId && cost && window.hive_keychain) {
        const operations = [
            [
                "custom_json",
                {
                    "required_auths": [username],
                    "required_posting_auths": [],
                    "id": "spkccT_extend",
                    "json": JSON.stringify({
                        "broca": parseInt(cost, 10),
                        "id": contractId,
                        "file_owner": username,
                        "power": 0 // Assuming power is not required for this operation, set to 0
                    })
                }
            ]
        ];
        window.hive_keychain.requestBroadcast(
            username,
            operations,
            'Active',
            function(response) {
                console.log('Extend operation broadcast response:', response);
                if (response.success) {
                    // Handle success, update UI accordingly
                    alert('Extend storage request successfully broadcasted to the blockchain.');
                } else {
                    // Handle error, update UI accordingly
                    alert('Failed to broadcast extend storage request: ' + response.message);
                }
            }
        );
    } else {
        alert('Hive Keychain is not installed or the contract ID/cost is missing.');
    }
}
