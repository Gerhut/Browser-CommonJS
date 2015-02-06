# Browser-CommonJS

Use CommonJS module in browser.

## Usage

```html
<script src="browser-common.js"></script>
<script>
  useCommonJSModule('main', function (exports) {
    console.log(exports)
  })
</script>
```
