# TimeTableLib

**TimeTableLib** is a lightweight JavaScript library for creating interactive timetables. It is designed to be easily imported and customized.

## Features

- Displays events using fixed 15‑minute segments.
- Customizable styling via CSS.
- Responsive design (table and container automatically adjust to viewport).
- Modal for detailed event information.
- Supports multiple module systems (global browser scope and CommonJS).

## Installation

### Via Script Tags

Include the stylesheet and script in your HTML:

```html
<link rel="stylesheet" href="path/to/style.css" />
<script src="path/to/timetable.js"></script>
```

### As a Module

If using a bundler, import the library:

```javascript
import Timetable from "path/to/timetable.js";
import "path/to/style.css";
```

## Usage Example

Create a container in your HTML:

```html
<div id="timetable-container"></div>
```

Initialize the library with your data:

```javascript
const scheduleData = [
  {
    Date: "10/03/2025",
    Heure: "14:00-15:00",
    Matière: "IN2R06",
    Personnel: "ZEITOUNI Karine",
    Groupe: "INF1",
    Salle: "Amphi B - VEL",
    "Catégorie d’événement": "Cours Magistraux (CM)",
    Remarques: null,
  },
  // ... additional events ...
];

document.addEventListener("DOMContentLoaded", function () {
  const timetable = new Timetable("timetable-container", scheduleData, {
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    timeInterval: 15,
    minRowSpan: 2,
    showIcons: true,
    modalEnabled: true,
  });
});
```

## Customization

### Configuration Options

| Option        | Type    | Default                                                    | Description                                               |
|---------------|---------|------------------------------------------------------------|-----------------------------------------------------------|
| weekdays      | Array   | `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]` | List of weekdays to display                               |
| timeInterval  | Number  | `15`                                                       | Duration (in minutes) of each time segment                |
| minRowSpan    | Number  | `2`                                                        | Minimum number of segments for very short events          |
| showIcons     | Boolean | `true`                                                     | Enable/disable display of icons                           |
| modalEnabled  | Boolean | `true`                                                     | Toggle the modal for detailed event information           |
| showProf      | Boolean | `true`                                                     | Display professor info as basic details on events         |
| showClasse    | Boolean | `true`                                                     | Display classroom info as basic details on events         |

### Styling

Customize appearance by overriding the CSS classes in **style.css**. For example, you can change primary colors, spacings, or fonts.

```css
/* Example: Override primary color */
.timetable-wrapper {
  --primary-color: #ff5722;
}
```

For further customization, refer to the CSS comments in our [style.css](./style.css) file.

## Importing the Library

The library is distributed as a UMD module. In the browser, it attaches to the global scope as `window.Timetable`. For CommonJS, you can require it.

## Contributing

If you'd like to contribute or report issues, please open an issue on our [GitHub repository](https://github.com/shadowforce78/TimeTableLib).

## License

MIT License. See [LICENSE](./LICENSE) for details.
