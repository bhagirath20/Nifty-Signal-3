document.addEventListener("DOMContentLoaded", () => {
  let currentPage = 0; // Current page number for pagination
  let isLoading = false; // Flag to prevent multiple data loading requests
  let hasMoreData = true; // Flag to indicate if there's more data to load
  let displayedData = []; // Array to store IDs of displayed data to prevent duplicates
  let dateCounters = {}; // Object to track total counts per date
  let dateItems = {}; // Object to track items by date for numbering
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

  // --- Scroll Buttons ---
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  const scrollToBottomBtn = document.getElementById("scrollToBottomBtn");

  // Show/hide buttons based on scroll position
  window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
      scrollToTopBtn.style.display = "block";
    } else {
      scrollToTopBtn.style.display = "none";
    }
    // Show bottom button if not at the bottom
    if (
      window.innerHeight + window.scrollY <
      document.body.offsetHeight - 100
    ) {
      scrollToBottomBtn.style.display = "block";
    } else {
      scrollToBottomBtn.style.display = "none";
    }
  });

  // Scroll to top
  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Scroll to bottom
  scrollToBottomBtn.addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });

  /**
   * Gets the date part of a timestamp for tracking numbering by date
   * @param {number} timestamp - The timestamp to extract date from
   * @returns {string} Date string in YYYY-MM-DD format
   */
  const getDateString = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  /**
   * First pass: count all items per date to establish correct numbering
   * @param {Array} data - Array of data items
   */
  const countItemsByDate = (data) => {
    data.forEach((item) => {
      const dateStr = getDateString(item.timestamp);
      if (!dateCounters[dateStr]) {
        dateCounters[dateStr] = 0;
        dateItems[dateStr] = [];
      }
      dateCounters[dateStr]++;
      dateItems[dateStr].push(item);
    });
  };

  /**
   * Get the appropriate item number based on date in INCREASING order
   * @param {number} timestamp - The timestamp of the data item
   * @param {string} itemId - The ID of the item
   * @returns {number} The sequence number for this item (lower = newer)
   */
  const getItemNumber = (timestamp, itemId) => {
    const dateStr = getDateString(timestamp);

    // Get sorted items for the date (oldest first)
    const itemsForDate = [...dateItems[dateStr]].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const itemIndex = itemsForDate.findIndex((item) => item.id === itemId);

    // Return number based on chronological order (oldest = #1)
    return itemIndex - 1;
  };

  /**
   * Creates a data card element to display trading information.
   * @param {object} data - The data object containing trading information.
   * @param {boolean} isNew - Whether this is a new entry to highlight
   * @returns {HTMLElement} The data card element.
   */
  const createDataCard = (data, isNew = false) => {
    const card = document.createElement("div");
    card.className = `data-card ${isNew ? "new-entry-highlight" : ""}`;

    // Get the appropriate item number for this date
    const dateStr = getDateString(data.timestamp);
    const itemNumber = getItemNumber(data.timestamp, data.id);

    // Signal class handling
    let signalValue = data.signal_ || "NEUTRAL";
    let signalClass = `SIGNAL: ${signalValue}`;
    let signalClassName = signalValue.toLowerCase();

    //   <div class="symbol">#${itemNumber} - ${data.symbol}</div>
    card.innerHTML = `
        <div class="card-header">
     
            <div class="symbol">#${data.id} - ${data.symbol}</div>
          <div class="timestamp highlight-timestamp">${formatDate(
            data.timestamp
          )}</div>
        </div>
        <div class="card-body">
          <div class="price">Price: ${data.price}</div>
          <div class="signal signal-${signalClassName}">${signalClass}</div>
          <div class="additional-info">Note: ${data.additional_info || ""}</div>
        </div>
    `; // Populate card with HTML

    return card; // Return the created card element
  };

  /**
   * Sort data by timestamp, newest first
   * @param {Array} data - Array of data objects
   * @returns {Array} Sorted array
   */
  const sortByTimestamp = (data) => {
    return [...data].sort((a, b) => b.timestamp - a.timestamp);
  };

  /**
   * Group data by date for displaying
   * @param {Array} data - Array of data objects
   * @returns {Object} Object with dates as keys and arrays of data as values
   */
  const groupByDate = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const dateStr = getDateString(item.timestamp);
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(item);
    });

    return grouped;
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

      // Find new entries (when reloading)
      const newEntries = isInitialLoad
        ? []
        : newData.filter((item) => !displayedData.includes(item.id));

      // First count all items
      if (page === 0) {
        // Reset counters on first page
        dateCounters = {};
        dateItems = {};
      }

      // Count all items for proper numbering
      countItemsByDate(newData);

      if (page === 0) {
        dataContainer.innerHTML = ""; // Clear existing data on first load

        // Group data by date
        const sortedData = sortByTimestamp(newData);
        const groupedData = groupByDate(sortedData);

        // Process each date group
        Object.keys(groupedData)
          .sort()
          .reverse()
          .forEach((dateStr) => {
            // Add date separator
            const dateSeparator = document.createElement("div");
            dateSeparator.className = "date-separator";
            dateSeparator.textContent = new Date(dateStr).toLocaleDateString(
              undefined,
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            );
            dataContainer.appendChild(dateSeparator);

            // Sort items by timestamp, newest first
            const itemsForDate = sortByTimestamp(groupedData[dateStr]);

            // Add items for this date
            itemsForDate.forEach((item) => {
              // Check if this is a new entry
              const isNew = newEntries.some(
                (newItem) => newItem.id === item.id
              );
              const card = createDataCard(item, isNew);
              dataContainer.appendChild(card);
            });
          });

        displayedData = newIds; // Update displayed data IDs
      } else {
        const newEntries = newData.filter(
          (item) => !displayedData.includes(item.id)
        ); // Filter out already displayed data

        if (newEntries.length > 0) {
          // Group new entries by date
          const groupedNewEntries = groupByDate(sortByTimestamp(newEntries));

          // For each date in the new entries
          Object.keys(groupedNewEntries)
            .sort()
            .reverse()
            .forEach((dateStr) => {
              // Check if we already have this date displayed
              const existingDateSeparator = Array.from(
                dataContainer.querySelectorAll(".date-separator")
              ).find(
                (el) =>
                  el.textContent ===
                  new Date(dateStr).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
              );

              if (!existingDateSeparator) {
                // Add new date separator
                const dateSeparator = document.createElement("div");
                dateSeparator.className = "date-separator";
                dateSeparator.textContent = new Date(
                  dateStr
                ).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                dataContainer.appendChild(dateSeparator);
              }

              // Sort items by timestamp, newest first
              const itemsForDate = sortByTimestamp(groupedNewEntries[dateStr]);

              // Add items for this date
              itemsForDate.forEach((item) => {
                const card = createDataCard(item, true); // Create card with highlight

                // If the date separator exists, find where to insert the card
                if (existingDateSeparator) {
                  let insertAfter = existingDateSeparator;
                  // Find the last card for this date
                  let nextElement = existingDateSeparator.nextElementSibling;
                  while (
                    nextElement &&
                    nextElement.classList.contains("data-card")
                  ) {
                    insertAfter = nextElement;
                    nextElement = nextElement.nextElementSibling;
                  }

                  if (insertAfter.nextElementSibling) {
                    dataContainer.insertBefore(
                      card,
                      insertAfter.nextElementSibling
                    );
                  } else {
                    dataContainer.appendChild(card);
                  }
                } else {
                  dataContainer.appendChild(card);
                }
              });
            });
        }

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

  // Add styles for "NEW" tag and improved card styling
  const addStyles = () => {
    const styleElement = document.createElement("style");
    styleElement.textContent = document.head.appendChild(styleElement);
  };

  // Add styles
  addStyles();

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

      // Reload the entire page when new data arrives
      window.location.reload();
    }
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
});
