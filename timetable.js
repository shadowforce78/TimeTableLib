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
        
        // Load required CSS and dependencies
        this._loadDependencies();
        
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
            showIcons: true
        };
        
        return {...defaults, ...userOptions};
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
                "Saturday",
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
                        event.Matière || event["Catégorie d'événement"] || "Unspecified",
                    location: event.Salle || "TBD",
                    staff: event.Personnel || "N/A",
                    group: event.Groupe || "All",
                    category: event["Catégorie d'événement"] || "Other",
                    remarks: event.Remarques || "",
                });
            }
        });

        return prepared;
    }

    /**
     * Generates time slots based on events
     */
    generateTimeSlots() {
        // Find the earliest start time and latest end time across all events
        let earliestStart = 23 * 60 + 59; // 23:59 in minutes
        let latestEnd = 0;

        Object.values(this.data).forEach((dayEvents) => {
            dayEvents.forEach((event) => {
                earliestStart = Math.min(earliestStart, event.startMinutes);
                latestEnd = Math.max(latestEnd, event.endMinutes);
            });
        });

        // Round down to the nearest interval for start time
        earliestStart = Math.floor(earliestStart / this.options.timeInterval) * this.options.timeInterval;
        // Round up to the nearest interval for end time
        latestEnd = Math.ceil(latestEnd / this.options.timeInterval) * this.options.timeInterval;

        // Create time slots with specified time intervals
        const slots = [];
        for (let time = earliestStart; time < latestEnd; time += this.options.timeInterval) {
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
        // Calculate rowspan based on duration (in time interval slots)
        let rowSpan = Math.max(this.options.minRowSpan, Math.ceil(duration / this.options.timeInterval));
        return rowSpan;
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
            if (timeSlot.isHour || timeSlot.isHalfHour) {
                timeCell.textContent = timeSlot.label;
                timeCell.classList.add("time-cell");
                if (timeSlot.isHour) {
                    timeCell.classList.add("hour-cell");
                } else {
                    timeCell.classList.add("half-hour-cell");
                }
            } else {
                timeCell.classList.add("time-cell", "quarter-cell");
            }
            row.appendChild(timeCell);

            // Create cells for each day
            days.forEach((day) => {
                // Skip if this cell is already occupied by a rowspan from an earlier event
                if (cellOccupied[day][slotIndex]) {
                    return;
                }

                // Find events that start at this time slot
                const eventsStartingHere = this.data[day].filter((event) => {
                    return (
                        event.startMinutes >= timeSlot.minutes &&
                        event.startMinutes < timeSlot.minutes + this.options.timeInterval
                    );
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
                        const categoryClass = event.category.toLowerCase().replace(/\s+/g, "-");
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
