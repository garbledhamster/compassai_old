# VS Code Tips
## Line Operations
### Duplicate Line
To duplicate a line in VS Code:
1. Position the cursor on the line you want to duplicate.
2. Press Ctrl + Shift + D (Windows) or Cmd + Shift + D (Mac).
3. The line should be duplicated below the current line.

# HTML
## HTML Structure
HTML structure refers to the arrangement of HTML elements on a web page. The main components of an HTML structure include:

- Doctype
- HTML Tag
- Head Tag
- Body Tag

Here's an example of a basic HTML structure:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Head content goes here -->
</head>
<body>
    <!-- Body content goes here -->
</body>
</html>
```

## HTML Common Elements
### Headings
Headers in HTML are defined using `<h1>` to `<h6>` tags, where `<h1>` defines the most important heading and `<h6>` defines the least important heading.

### Importing CSS
To import a CSS file in HTML, use the `<link>` tag in the `<head>` section of your HTML file:

```html
<head>
    <link rel="stylesheet" type="text/css" href="styles.css">
</head>
```

### Including Scripts
Scripts such as JavaScript can be included in the `<head>` or `<body>` sections of your HTML file:

```html
<head>
    <script src="script.js"></script>
</head>
```

### Paragraphs
In HTML, paragraphs are defined with the `<p>` tag:

```html
<p>This is a paragraph.</p>
```

### Divisions
The `<div>` tag defines a division or section in an HTML document. It is used as a container for HTML elements:

```html
<div>
    <p>This is a division or section.</p>
</div>
```

### Text Inputs
The `<input>` tag specifies an input field where the user can enter data:

```html
<input type="text">
```

### Including Scripts
Scripts such as JavaScript can also be included in the `<body>` section of your HTML file, typically right before the closing `</body>` tag:

```html
<body>
    <!-- Page content -->
    <script src="script.js"></script>
</body>
```

# CSS
## Selecting HTML Elements
### Select by Element
To select an HTML element by its tag name in CSS, simply use the name of the tag:

```css
p {
    color: red;
}
```

### Select by Class
To select HTML elements by class, use a period followed by the class name:

```css
.my-class {
    color: red;
}
```

### Select by ID
To select an HTML element by ID, use a hash followed by the ID:

```css
#my-id {
    color: red;
}
```

## Formatting the CSS Document
### Ordering CSS Rules
To make your CSS file more readable, it's recommended to order the CSS rules in a specific way:

1. CSS resets (if any)
2. Global styles
3. Layout styles (header, footer, main, aside)
4. Specific component styles

### Combining CSS for Multiple Elements
If multiple elements should share the same styles, you can group them in a comma-separated list:

```css
h1, h2, p {
    color: red;
}
```

### Styling Triggered Events
CSS allows styling elements based on user interaction. Commonly used pseudo-classes for triggered events include `:hover`, `:focus`, and `:active`:

```css
button

:hover {
    background-color: blue;
}

input:focus {
    border-color: green;
}
```