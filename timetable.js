/**
 * TimeTableLib - A JavaScript library for displaying interactive timetables
 * Version 1.0.0
 */

class Timetable {
    /**
     * Creates a new Timetable instance
     * @param {string} containerId - ID of the container element
     * @param {Array} data - Array of event objects
     * @param {Object} options - Configuration options (optional)
     */
    constructor(containerId, data, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = this._mergeDefaultOptions(options);
        this.data = this.prepareData(data);
        this.timeSlots = this.generateTimeSlots();
        this.modalElement = null;

        // Load required CSS and dependencies
        this._loadDependencies();

        // Create modal
        this._createModal();

        // Render the timetable
        this.render();
    }

    /**
     * Merges user provided options with defaults
     */
    _mergeDefaultOptions(userOptions) {
        const defaults = {
            weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            timeInterval: 15, // minutes
            minRowSpan: 2,
            showIcons: true,
            modalEnabled: true // New option to enable/disable modal
        };

        return { ...defaults, ...userOptions };
    }

    /**
     * Loads external dependencies (FontAwesome)
     */
    _loadDependencies() {
        // Add Font Awesome for icons if not present and icons are enabled
        if (this.options.showIcons && !document.getElementById("font-awesome-css")) {
            const fontAwesome = document.createElement("link");
            fontAwesome.id = "font-awesome-css";
            fontAwesome.rel = "stylesheet";
            fontAwesome.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
            document.head.appendChild(fontAwesome);
        }
    }

    /**
     * Prepares raw data into a format suitable for the timetable
     */
    prepareData(rawData) {
        // Initialize prepared data object with weekdays
        let prepared = {};
        this.options.weekdays.forEach(day => {
            prepared[day] = [];
        });

        // Map date string (dd/mm/yyyy) to day of week
        const getDayOfWeek = (dateStr) => {
            const parts = dateStr.split("/");
            const date = new Date(parts[2], parts[1] - 1, parts[0]);
            const days = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
            ];
            return days[date.getDay()];
        };

        // Process time string to get start and end times in minutes from midnight
        const processTime = (timeStr) => {
            const [range, startTime, endTime] = timeStr
                .match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/)
                .slice(0, 3);

            const getMinutes = (time) => {
                const [hours, minutes] = time.split(":").map(Number);
                return hours * 60 + minutes;
            };

            const startMinutes = getMinutes(startTime);
            const endMinutes = getMinutes(endTime);

            return {
                startTime,
                endTime,
                startMinutes,
                endMinutes,
                duration: endMinutes - startMinutes,
            };
        };

        rawData.forEach((event) => {
            const day = getDayOfWeek(event.Date);
            if (prepared[day]) {
                const timeInfo = processTime(event.Heure);

                prepared[day].push({
                    startTime: timeInfo.startTime,
                    endTime: timeInfo.endTime,
                    startMinutes: timeInfo.startMinutes,
                    endMinutes: timeInfo.endMinutes,
                    duration: timeInfo.duration,
                    name:
                        event.Matière || event["Catégorie d’événement"] || "Unspecified",
                    location: event.Salle || "TBD",
                    staff: event.Personnel || "N/A",
                    group: event.Groupe || "All",
                    category: event["Catégorie d’événement"] || "Other",
                    remarks: event.Remarques || "",
                });
            }
        });

        return prepared;
    }

    /**
     * Generates time slots based on fixed range from 8:00 to 18:00
     */
    generateTimeSlots() {
        // Use fixed start and end times (8:00 to 18:00)
        const startHour = 8; // 8:00
        const endHour = 18;  // 18:00
        
        // Convert hours to minutes
        const startTimeMinutes = startHour * 60;
        const endTimeMinutes = endHour * 60;
        
        // Create time slots with specified time intervals
        const slots = [];
        for (let time = startTimeMinutes; time < endTimeMinutes; time += this.options.timeInterval) {
            const hour = Math.floor(time / 60);
            const minute = time % 60;
            slots.push({
                label: `${hour.toString().padStart(2, "0")}:${minute
                    .toString()
                    .padStart(2, "0")}`,
                minutes: time,
                isHour: minute === 0, // Flag to identify full hours
                isHalfHour: minute === 30, // Flag to identify half hours
            });
        }

        return slots;
    }

    /**
     * Gets index of time slot for a specific time in minutes
     * @param {number} timeInMinutes - Time in minutes from midnight
     * @returns {number} Index of the corresponding time slot
     */
    getTimeSlotIndex(timeInMinutes) {
        // Find the first slot that contains this time
        const interval = this.options.timeInterval;
        const firstSlotMinutes = this.timeSlots[0].minutes;
        
        // Calculate how many intervals from the first slot
        const slotIndex = Math.floor((timeInMinutes - firstSlotMinutes) / interval);
        return Math.max(0, Math.min(slotIndex, this.timeSlots.length - 1));
    }

    /**
     * Formats time label
     */
    formatTimeLabel(minutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        return `${hour.toString().padStart(2, "0")}:${minute
            .toString()
            .padStart(2, "0")}`;
    }

    /**
     * Calculate rowspan based on event duration
     */
    getRowSpan(duration) {
        // Calculate rowspan based strictly on duration (in time interval slots)
        // This ensures that an event's height is proportional to its duration
        let rowSpan = Math.ceil(duration / this.options.timeInterval);
        return rowSpan;
    }

    /**
     * Creates modal element for event details
     */
    _createModal() {
        // Only create modal if enabled in options
        if (!this.options.modalEnabled) {
            return;
        }

        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'timetable-modal-backdrop';
        
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'timetable-modal';
        
        // Modal header with close button
        const modalHeader = document.createElement('div');
        modalHeader.className = 'timetable-modal-header';
        
        const modalTitle = document.createElement('h3');
        modalTitle.className = 'timetable-modal-title';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'timetable-modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            this.closeModal();
        });
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Color indicator at top of modal
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'modal-color-indicator';
        
        // Modal body for content
        const modalBody = document.createElement('div');
        modalBody.className = 'timetable-modal-body';
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'timetable-modal-footer';
        
        // Assemble modal
        modal.appendChild(colorIndicator);
        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        modal.appendChild(modalFooter);
        modalBackdrop.appendChild(modal);
        
        // Add click event to backdrop for closing
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                this.closeModal();
            }
        });
        
        // Add keyboard event to close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Add to DOM
        document.body.appendChild(modalBackdrop);
        this.modalElement = {
            backdrop: modalBackdrop,
            modal: modal,
            title: modalTitle,
            body: modalBody,
            footer: modalFooter,
            colorIndicator: colorIndicator
        };
    }

    /**
     * Cleans category string for CSS class use by removing parentheses and special characters
     * @param {string} category - The category string to clean
     * @returns {string} Cleaned category string suitable for CSS class
     */
    _cleanCategoryForCss(category) {
        if (!category) return 'other';
        // Remove parentheses and their content, then trim and convert to kebab-case
        return category
            .replace(/\s*\([^)]*\)/g, '') // Remove parentheses and their content
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-');
    }

    /**
     * Opens modal with event details
     * @param {Object} event - Event object with details
     */
    openModal(event) {
        if (!this.modalElement || !this.options.modalEnabled) {
            return;
        }
        
        // Set category class for styling - use cleaned category
        const categoryClass = this._cleanCategoryForCss(event.category);
        this.modalElement.colorIndicator.className = 'modal-color-indicator';
        this.modalElement.colorIndicator.classList.add(categoryClass);
        
        // Set title
        this.modalElement.title.textContent = event.name;
        
        // Build content
        let content = '';
        
        // Time information
        content += `
            <div class="timetable-modal-info">
                <h4>Time</h4>
                <p>${event.startTime} - ${event.endTime}</p>
            </div>
        `;
        
        // Category
        if (event.category) {
            content += `
                <div class="timetable-modal-info">
                    <h4>Category</h4>
                    <p>${event.category}</p>
                </div>
            `;
        }
        
        // Location
        if (event.location && event.location !== "TBD") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Location</h4>
                    <p>${event.location}</p>
                </div>
            `;
        }
        
        // Staff
        if (event.staff && event.staff !== "N/A") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Staff</h4>
                    <p>${event.staff}</p>
                </div>
            `;
        }
        
        // Group
        if (event.group && event.group !== "All") {
            content += `
                <div class="timetable-modal-info">
                    <h4>Group</h4>
                    <p>${event.group}</p>
                </div>
            `;
        }
        
        // Remarks
        if (event.remarks) {
            content += `
                <div class="timetable-modal-info">
                    <h4>Notes</h4>
                    <p>${event.remarks}</p>
                </div>
            `;
        }
        
        // Set content
        this.modalElement.body.innerHTML = content;
        
        // Add close button to footer
        this.modalElement.footer.innerHTML = '<button class="btn-close">Close</button>';
        this.modalElement.footer.querySelector('.btn-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Show modal
        this.modalElement.backdrop.classList.add('active');
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the modal
     */
    closeModal() {
        if (!this.modalElement) {
            return;
        }
        
        this.modalElement.backdrop.classList.remove('active');
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }

    /**
     * Renders the timetable
     */
    render() {
        if (!this.container) {
            console.error("Timetable container not found");
            return;
        }

        this.container.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.classList.add("timetable-wrapper");

        let table = document.createElement("table");
        table.classList.add("timetable");

        // Generate header
        let thead = document.createElement("thead");
        let headRow = document.createElement("tr");
        ["Time", ...Object.keys(this.data)].forEach((day) => {
            let th = document.createElement("th");
            th.textContent = day;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Generate body
        let tbody = document.createElement("tbody");

        // Create a 2D grid to track cell availability
        const days = Object.keys(this.data);
        const cellOccupied = {}; // Track which cells are already occupied
        days.forEach((day) => {
            cellOccupied[day] = {};
        });

        // Sort events for each day by start time
        days.forEach((day) => {
            this.data[day].sort((a, b) => a.startMinutes - b.startMinutes);
        });

        // Pre-process events to assign them to the correct slot
        days.forEach((day) => {
            this.data[day].forEach((event) => {
                // Calculate which slot this event starts in
                event.slotIndex = this.getTimeSlotIndex(event.startMinutes);
            });
        });

        // Generate rows for each time slot
        this.timeSlots.forEach((timeSlot, slotIndex) => {
            let row = document.createElement("tr");
            row.setAttribute("data-time", timeSlot.minutes);

            // Add classes to help with styling
            if (timeSlot.isHour) {
                row.classList.add("hour-row");
            } else if (timeSlot.isHalfHour) {
                row.classList.add("half-hour-row");
            } else {
                row.classList.add("quarter-row");
            }

            // Time column - only show labels for hours and half hours
            let timeCell = document.createElement("td");
            if (timeSlot.isHour) {
                timeCell.textContent = timeSlot.label;
                timeCell.classList.add("time-cell");
                timeCell.classList.add("hour-cell");
            } else {
                timeCell.classList.add("time-cell");
                if (timeSlot.isHalfHour) {
                    timeCell.classList.add("half-hour-cell");
                } else {
                    timeCell.classList.add("quarter-cell");
                }
            }
            row.appendChild(timeCell);

            // Create cells for each day
            days.forEach((day) => {
                // Skip if this cell is already occupied by a rowspan from an earlier event
                if (cellOccupied[day][slotIndex]) {
                    return;
                }

                // Find events that should start at exactly this time slot
                const eventsStartingHere = this.data[day].filter((event) => {
                    return event.slotIndex === slotIndex;
                });

                if (eventsStartingHere.length > 0) {
                    // We have events starting at this slot
                    eventsStartingHere.forEach((event) => {
                        const rowSpan = this.getRowSpan(event.duration);
                        let cell = document.createElement("td");
                        cell.classList.add("event-cell");

                        if (rowSpan > 1) {
                            cell.setAttribute("rowspan", rowSpan);

                            // Mark future slots as occupied
                            for (
                                let i = 1;
                                i < rowSpan && slotIndex + i < this.timeSlots.length;
                                i++
                            ) {
                                cellOccupied[day][slotIndex + i] = true;
                            }
                        }

                        // Create the event div
                        let eventDiv = document.createElement("div");
                        const categoryClass = this._cleanCategoryForCss(event.category);
                        eventDiv.classList.add("event", categoryClass);

                        // Add classes to indicate duration
                        if (event.duration <= 30) eventDiv.classList.add("short-event");
                        else if (event.duration <= 60) eventDiv.classList.add("medium-event");
                        else eventDiv.classList.add("long-event");

                        // Add color bar at the top
                        let colorBar = document.createElement("div");
                        colorBar.classList.add("event-color-bar", categoryClass);
                        eventDiv.appendChild(colorBar);

                        // Course title
                        let titleElem = document.createElement("div");
                        titleElem.classList.add("event-title");
                        titleElem.textContent = event.name;
                        eventDiv.appendChild(titleElem);

                        // Time range
                        let timeRangeElem = document.createElement("div");
                        timeRangeElem.classList.add("event-time");
                        timeRangeElem.textContent = `${event.startTime} - ${event.endTime}`;
                        eventDiv.appendChild(timeRangeElem);

                        // Event details
                        let detailsElem = document.createElement("div");
                        detailsElem.classList.add("event-details");

                        // Add icons for each information element if enabled
                        if (this.options.showIcons) {
                            if (event.location && event.location !== "TBD") {
                                detailsElem.innerHTML += `
                                    <div class="location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>
                                `;
                            }

                            if (event.staff && event.staff !== "N/A") {
                                detailsElem.innerHTML += `
                                    <div class="staff"><i class="fas fa-user"></i> ${event.staff}</div>
                                `;
                            }

                            if (event.group && event.group !== "All") {
                                detailsElem.innerHTML += `
                                    <div class="group"><i class="fas fa-users"></i> ${event.group}</div>
                                `;
                            }

                            if (event.remarks) {
                                detailsElem.innerHTML += `
                                    <div class="remarks"><i class="fas fa-info-circle"></i> ${event.remarks}</div>
                                `;
                            }
                        } else {
                            // No icons, just text
                            if (event.location && event.location !== "TBD") {
                                detailsElem.innerHTML += `<div class="location">Location: ${event.location}</div>`;
                            }

                            if (event.staff && event.staff !== "N/A") {
                                detailsElem.innerHTML += `<div class="staff">Staff: ${event.staff}</div>`;
                            }

                            if (event.group && event.group !== "All") {
                                detailsElem.innerHTML += `<div class="group">Group: ${event.group}</div>`;
                            }

                            if (event.remarks) {
                                detailsElem.innerHTML += `<div class="remarks">Note: ${event.remarks}</div>`;
                            }
                        }

                        eventDiv.appendChild(detailsElem);

                        // Add click event to open modal with details
                        if (this.options.modalEnabled) {
                            eventDiv.addEventListener('click', () => {
                                this.openModal(event);
                            });
                        }

                        cell.appendChild(eventDiv);
                        row.appendChild(cell);
                    });
                } else if (!cellOccupied[day][slotIndex]) {
                    // Empty cell
                    let cell = document.createElement("td");
                    cell.classList.add("empty-cell");
                    if (timeSlot.isHour) {
                        cell.classList.add("hour-cell");
                    } else if (timeSlot.isHalfHour) {
                        cell.classList.add("half-hour-cell");
                    } else {
                        cell.classList.add("quarter-cell");
                    }
                    row.appendChild(cell);
                }
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        wrapper.appendChild(table);
        this.container.appendChild(wrapper);
    }
}

// Make Timetable available in the global scope for browser environments
if (typeof window !== 'undefined') {
    window.Timetable = Timetable;
}

// Support CommonJS for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Timetable;
}
