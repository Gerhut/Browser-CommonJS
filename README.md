# Browser-CommonJS

Use CommonJS module in browser.

## Usage

```html
<script src="contentloaded.js"></script>
<script src="browser-common.js"></script>
<script type="application/x-commonjs-module">
  this.globalFunc = function() {
    return require('./module') + require('./requireModule')
  }
</script>
```
