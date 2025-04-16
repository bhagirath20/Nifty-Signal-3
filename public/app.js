document.addEventListener("DOMContentLoaded", () => {
  let currentPage = 0; // Current page number for pagination
  let isLoading = false; // Flag to prevent multiple data loading requests
  let hasMoreData = true; // Flag to indicate if there's more data to load
  let displayedData = []; // Array to store IDs of displayed data to prevent duplicates
  const dataContainer = document.getElementById("data-container"); // Container for data cards
  const loadingSpinner = document.getElementById("loading-spinner"); // Loading spinner element
  let initialLoadComplete = false; // Flag to track if the initial load is complete

  /**
   * Formats a timestamp into a human-readable date and time string.
   * @param {number} timestamp - The timestamp to format.
   * @returns {string} The formatted date and time string.
   */
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  /**
   * Creates a data card element to display trading information.
   * @param {object} data - The data object containing trading information.
   * @returns {HTMLElement} The data card element.
   */
  const createDataCard = (data) => {
    const card = document.createElement("div");
    card.className = "data-card"; // Apply CSS class for styling

    let signalClass = `Signal: ${data.signal_}`; // Construct signal display text
    let priceDisplay = `Price: ${data.price}`; // Construct price display text
    let additional_infoHTML = `Note: ${data.additional_info}`; // Placeholder for additional info

    card.innerHTML = `
        <div class="card-header">
          <div class="symbol">${data.symbol}</div>
          <div class="timestamp">${formatDate(data.timestamp)}</div>
        </div>
        <div class="card-body">
          <div class="price">${priceDisplay}</div>
          <div class="signal ${signalClass}">${signalClass}</div>
         <div class="additional-info ${additional_infoHTML}"> ${additional_infoHTML}</div>
        </div>
    `; // Populate card with HTML

    return card; // Return the created card element
  };

  /**
   * Loads trading data from the server, updates the UI, and handles new data.
   * @param {number} page - The page number to load.
   * @param {boolean} isInitialLoad - Indicates whether it's the initial page load.
   */
  const loadData = async (page, isInitialLoad = false) => {
    if (isLoading || !hasMoreData) return; // Prevent concurrent loading or loading when no more data

    isLoading = true; // Set loading flag to true
    loadingSpinner.classList.remove("hidden"); // Show loading spinner

    try {
      const response = await fetch(`/api/data?page=${page}&limit=10`); // Fetch data from the server
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`); // Handle HTTP errors
      }

      const result = await response.json(); // Parse the JSON response
      if (!result.success) {
        throw new Error("Failed to fetch data: " + result.message); // Handle server errors
      }

      const newData = result.data; // Extract data from the result
      const newIds = newData.map((item) => item.id); // Extract IDs for duplicate check

      if (page === 0) {
        dataContainer.innerHTML = ""; // Clear existing data on first load
        displayedData = []; // Reset displayed data IDs
        newData.forEach((item) => {
          const card = createDataCard(item); // Create card for each data item
          dataContainer.appendChild(card); // Append card to the container
        });
        displayedData = newIds; // Update displayed data IDs
      } else {
        const newEntries = newData.filter(
          (item) => !displayedData.includes(item.id)
        ); // Filter out already displayed data
        newEntries.forEach((item) => {
          const card = createDataCard(item); // Create card for new data
          card.classList.add("new-entry-highlight"); // Apply highlight to new entries
          dataContainer.appendChild(card); // Append card to the container
        });
        displayedData = [...displayedData, ...newIds]; // Update displayed data IDs
      }

      if (newData.length === 0 || page >= result.totalPages - 1) {
        hasMoreData = false; // No more data to load
      }

      currentPage = page; // Update current page
    } catch (error) {
      console.error("Error loading data:", error); // Log the error
      dataContainer.innerHTML = `<div class="loading">Failed to load data. ${error.message}</div>`; // Display error message
    } finally {
      isLoading = false; // Reset loading flag
      loadingSpinner.classList.add("hidden"); // Hide loading spinner
      if (page === 0) {
        initialLoadComplete = true; // Mark initial load as complete
      }
    }
  };

  // Initial load: Fetch the first page of data
  loadData(0, true);

  // Infinite scroll functionality: Load more data when user scrolls to the bottom
  window.addEventListener("scroll", () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (
      scrollTop + clientHeight >= scrollHeight - 100 &&
      !isLoading &&
      hasMoreData
    ) {
      loadData(currentPage + 1); // Load the next page of data
    }
  });

  // WebSocket connection setup for real-time updates
  const ws = new WebSocket("ws://localhost:8080");

  ws.onopen = () => {
    console.log("WebSocket connection established");
  };

  ws.onmessage = (event) => {
    // Listen for 'newData' message from the server AND ensure initial load is complete
    if (event.data === "newData" && initialLoadComplete) {
      console.log("New data notification received from server");
      loadData(0); // Reload the first page to get the latest data
    }
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
});

////////////////////

// document.addEventListener("DOMContentLoaded", () => {
//   let currentPage = 0;
//   let isLoading = false;
//   let hasMoreData = true;
//   let displayedData = []; // To store the IDs of the currently displayed data
//   const notificationSound = new Audio("notification.mp3"); // Replace with your sound file
//   let soundEnabled = false;
//   const enableNotificationsButton = document.getElementById(
//     "enableNotifications"
//   );

//   const dataContainer = document.getElementById("data-container");
//   const loadingSpinner = document.getElementById("loading-spinner");

//   const formatDate = (timestamp) => {
//     const date = new Date(timestamp);
//     return date.toLocaleString();
//   };

//   const createDataCard = (data) => {
//     const card = document.createElement("div");
//     card.className = "data-card";

//     let signalClass = `Signal: ${data.signal_}`;

//     let priceDisplay = `Price: ${data.price}`;

//     let additional_infoHTML = "*******";

//     card.innerHTML = `
//         <div class="card-header">
//           <div class="symbol">${data.symbol}</div>
//           <div class="timestamp">${formatDate(data.timestamp)}</div>
//         </div>
//         <div class="card-body">
//           <div class="price">${priceDisplay}</div>
//           <div class="signal ${signalClass}">${signalClass}</div>
//           ${additional_infoHTML}
//         </div>
//     `;

//     return card;
//   };

//   const loadData = async (page, isInitialLoad = false) => {
//     if (isLoading || !hasMoreData) return;

//     isLoading = true;
//     loadingSpinner.classList.remove("hidden");

//     try {
//       const response = await fetch(`/api/data?page=${page}&limit=10`);

//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }

//       const result = await response.json();

//       if (!result.success) {
//         throw new Error("Failed to fetch data: " + result.message);
//       }

//       const newData = result.data;
//       const newIds = newData.map((item) => item.id);

//       if (page === 0) {
//         dataContainer.innerHTML = "";
//         const newlyArrived = isInitialLoad
//           ? []
//           : newData.filter((item) => !displayedData.includes(item.id));

//         if (!isInitialLoad && newlyArrived.length > 0 && soundEnabled) {
//           newlyArrived.forEach((newItem) => {
//             const card = createDataCard(newItem);
//             card.classList.add("new-entry-highlight");
//             dataContainer.prepend(card);
//           });
//           notificationSound
//             .play()
//             .catch((error) => console.error("Error playing sound:", error));
//         }

//         newData.forEach((item) => {
//           const card = createDataCard(item);
//           dataContainer.appendChild(card);
//         });
//         displayedData = newIds;
//       } else {
//         const newEntries = newData.filter(
//           (item) => !displayedData.includes(item.id)
//         );
//         newEntries.forEach((item) => {
//           const card = createDataCard(item);
//           dataContainer.appendChild(card);
//           card.classList.add("new-entry");
//         });
//         displayedData = [...displayedData, ...newIds];
//       }

//       if (newData.length === 0 || page >= result.totalPages - 1) {
//         hasMoreData = false;
//       }

//       currentPage = page;
//     } catch (error) {
//       console.error("Error loading data:", error);
//       dataContainer.innerHTML = `<div class="loading">Failed to load data. ${error.message}</div>`;
//     } finally {
//       isLoading = false;
//       loadingSpinner.classList.add("hidden");
//     }
//   };

//   const ws = new WebSocket("ws://localhost:8080"); // Connect to the WebSocket server

//   ws.onopen = () => {
//     console.log("WebSocket connection established");
//   };

//   ws.onmessage = (event) => {
//     if (event.data === "newData") {
//       console.log("New data notification received from server");
//       loadData(0); // Reload data when notified
//       // Optionally play the sound here as well
//       const notificationSound = new Audio("notification.mp3");
//       notificationSound
//         .play()
//         .catch((error) => console.error("Error playing sound:", error));
//     }
//   };

//   ws.onclose = () => {
//     console.log("WebSocket connection closed");
//   };

//   ws.onerror = (error) => {
//     console.error("WebSocket error:", error);
//   };

//   // Initial load (no need for setInterval anymore)
//   loadData(0, true);

//   if (enableNotificationsButton) {
//     enableNotificationsButton.addEventListener("click", () => {
//       if (soundEnabled) {
//         soundEnabled = false;
//         enableNotificationsButton.classList.remove("enabled");
//         enableNotificationsButton.textContent = "Enable Trading Signal Sounds";
//         if (currentSound) {
//           currentSound.pause();
//           currentSound = null;
//         }
//       } else {
//         notificationSound
//           .play()
//           .then((playingSound) => {
//             currentSound = playingSound;
//           })
//           .catch((error) => {
//             console.log(
//               "Autoplay prevented, but permission likely granted on click."
//             );
//           });
//         soundEnabled = true;
//         enableNotificationsButton.classList.add("enabled");
//         enableNotificationsButton.textContent = "Notifications Enabled";
//       }
//     });
//   }

//   window.addEventListener("scroll", () => {
//     const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

//     if (
//       scrollTop + clientHeight >= scrollHeight - 100 &&
//       !isLoading &&
//       hasMoreData
//     ) {
//       loadData(currentPage + 1);
//     }
//   });

//   // // Refresh every 30 seconds
//   // setInterval(() => {
//   //   loadData(0);
//   // }, 1000);
// });
