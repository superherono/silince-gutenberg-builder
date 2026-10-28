# WordPress Gutenberg - Best Practices

System prompt for agents that create WordPress Gutenberg blocks.

---

## 🔍 Checking That Information Is Current

**CRITICAL:** When generating React code for WordPress blocks (edit.js, save.js, index.js):

- ✅ **MUST use context7** to check the current documentation
- ✅ Add "use context7" to the prompt when generating React components
- ✅ Cross-check imports from `@wordpress/*` packages
- ✅ Check the API of methods, hooks, and components
- ✅ Use current versions of components

**Example prompt:**

```
use context7

Create an edit.js component for the hero block with RichText and MediaUpload.
Check the current imports from @wordpress/block-editor.
```

---

## 🎯 Interactive Selection of Block Properties

**IMPORTANT:** Before generating a block, you MUST ask the user:

1. **Which elements should be editable?**

   - Text (headings, paragraphs)
   - Images
   - Buttons (text, URL)
   - Other elements

2. **Which settings are needed in InspectorControls?**

   - Colors (text, background)
   - Font sizes
   - Spacing
   - Toggle options

3. **Block type:**
   - Static (save.js) or Dynamic (render.php)?

This data will define:

- Attributes in `block.json`
- Controls in `InspectorControls`
- The component structure

> **Detailed rules:** see `coding-rules.md` → "Interactive Selection of Editable Properties"

---

## 📦 Block Structure

### Required files:

```
blocks/{block-name}/
├── block.json       # Block manifest (API v3)
├── index.js         # Block registration
├── edit.js          # Backend component (editor)
├── save.js          # Frontend (static rendering)
├── style.scss       # Frontend styles
└── editor.scss      # Backend styles
```

### Optional files:

```
├── render.php       # Dynamic block (server-side rendering)
├── variations.js    # Block variations
└── transforms.js    # Transforms between blocks
```

---

## 📄 block.json (Manifest)

### Minimal configuration:

```json
{
	"$schema": "https://schemas.wp.org/trunk/block.json",
	"apiVersion": 3,
	"name": "namespace/block-name",
	"title": "Block Title",
	"category": "custom-category",
	"icon": "cover-image",
	"description": "Block description",
	"textdomain": "textdomain",
	"supports": {
		"html": false,
		"anchor": true,
		"align": ["wide", "full"],
		"spacing": {
			"margin": true,
			"padding": true
		}
	}
}
```

> This is the required section baseline. `anchor` / `align` / `spacing` MUST NOT be omitted (see §8 of the base standard / [validation-core-rules.md#supports-section-baseline](../guides/validation-core-rules.md#supports-section-baseline)). Child blocks — `{html:false, reusable:false}`.

### Important fields:

- **apiVersion: 3** - always use the latest version
- **supports** - defines the block's capabilities
- **attributes** - defines the editable properties

---

## ⚛️ edit.js (Backend Component)

### Base structure:

```jsx
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
	const { title } = attributes;

	const blockProps = useBlockProps({
		className: 'block-name',
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'textdomain')}>
					<TextControl label={__('Title', 'textdomain')} value={title} onChange={(value) => setAttributes({ title: value })} />
				</PanelBody>
			</InspectorControls>

			<section {...blockProps}>
				<div className='block-name__container'>{/* Content WITH __container */}</div>
			</section>
		</>
	);
}
```

### Required rules:

1. ✅ Use `useBlockProps()` for the root element
2. ✅ **ADD** the `__container` element (structure identical to save.js)
3. ✅ `InspectorControls` for settings in the sidebar
4. ✅ All strings via `__()` for i18n
5. ✅ `RichText` for editable text

### Checking via context7:

```
use context7

Check the current API for:
- useBlockProps
- RichText
- InspectorControls
- MediaUpload
```

---

## 💾 save.js (Frontend - Static)

### Base structure:

```jsx
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { title } = attributes;

	const blockProps = useBlockProps.save({
		className: 'block-name',
	});

	return (
		<section {...blockProps}>
			<div className='block-name__container'>{/* Content WITH __container */}</div>
		</section>
	);
}
```

### Required rules:

1. ✅ Use `useBlockProps.save()`
2. ✅ **MUST add** the `__container` element
3. ✅ `RichText.Content` for text output
4. ✅ DO NOT use hooks or dynamic data

---

## 🔧 render.php (Frontend - Dynamic)

### When to use:

- Server-side data is needed (post meta, query)
- Dynamic content
- SEO-critical content

### Base structure:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}

$title = $attributes['title'] ?? 'Default';

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'wp-block-namespace-blockname'
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <section class="block-name">
        <div class="block-name__container">
            <!-- Content WITH __container -->
        </div>
    </section>
</div>
```

### Required rules:

1. ✅ `ABSPATH` check
2. ✅ `get_block_wrapper_attributes()`
3. ✅ **REQUIRED** `__container` element
4. ✅ `wp_kses_post()` for HTML content
5. ✅ `esc_html()` / `esc_attr()` for text/attributes

---

## 🎨 WordPress Components

### Commonly used:

#### Text:

```jsx
import { RichText } from '@wordpress/block-editor';

<RichText tagName='h1' value={title} onChange={(value) => setAttributes({ title: value })} placeholder={__('Title', 'textdomain')} allowedFormats={['core/bold', 'core/italic']} />;
```

#### Image:

```jsx
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';

<MediaUploadCheck>
	<MediaUpload
		onSelect={(media) => setAttributes({ imageUrl: media.url })}
		allowedTypes={['image']}
		value={imageId}
		render={({ open }) => (
			<Button onClick={open} variant='secondary'>
				{__('Select image', 'textdomain')}
			</Button>
		)}
	/>
</MediaUploadCheck>;
```

#### URL:

```jsx
import { URLInput } from '@wordpress/block-editor';

<URLInput value={buttonUrl} onChange={(value) => setAttributes({ buttonUrl: value })} />;
```

---

## 🎛️ InspectorControls (Sidebar Settings)

### Main components:

```jsx
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl, SelectControl, RangeControl, ColorPalette } from '@wordpress/components';

<InspectorControls>
	<PanelBody title={__('General settings', 'textdomain')}>
		<TextControl label={__('Text', 'textdomain')} value={text} onChange={(value) => setAttributes({ text: value })} />

		<ToggleControl label={__('Enable', 'textdomain')} checked={isEnabled} onChange={(value) => setAttributes({ isEnabled: value })} />

		<SelectControl
			label={__('Type', 'textdomain')}
			value={type}
			options={[
				{ label: 'Option 1', value: 'option1' },
				{ label: 'Option 2', value: 'option2' },
			]}
			onChange={(value) => setAttributes({ type: value })}
		/>
	</PanelBody>

	<PanelBody title={__('Colors', 'textdomain')} initialOpen={false}>
		<ColorPalette value={bgColor} onChange={(value) => setAttributes({ bgColor: value })} />
	</PanelBody>
</InspectorControls>;
```

---

## 🌐 Internationalization (i18n)

### Required rules:

1. ✅ All strings via `__()`
2. ✅ Specify the textdomain
3. ✅ Use context where needed

```jsx
import { __ } from '@wordpress/i18n';

// Simple string
__('Title', 'textdomain');

// With context
_x('Post', 'noun', 'textdomain');

// Plural
_n('One item', '%d items', count, 'textdomain');
```

---

## 🔒 Supports (Block Capabilities)

### Recommended settings:

**Required section baseline** (`html` + `anchor` + `align` + `spacing`) plus optional `color` / `typography`:

```json
{
	"supports": {
		// baseline — required for sections:
		"html": false,
		"anchor": true,
		"align": ["wide", "full"],
		"spacing": {
			"margin": true,
			"padding": true
		},
		// optional (add as needed):
		"color": {
			"background": true,
			"text": true
		},
		"typography": {
			"fontSize": true,
			"lineHeight": true
		}
	}
}
```

---

## ⚠️ Common Errors

### ❌ Error 1: Missing container

```jsx
// INCORRECT - no __container
<section {...blockProps}>
    <div className='block-hero__body'>
</section>

// CORRECT - has __container
<section {...blockProps}>
    <div className='block-hero__container'>
        <div className='block-hero__body'>
</section>
```

### ❌ Error 2: Forgot i18n

```jsx
// INCORRECT
placeholder='Enter text'

// CORRECT
placeholder={__('Enter text', 'textdomain')}
```

### ❌ Error 3: Wrong useBlockProps

```jsx
// INCORRECT (save.js)
const blockProps = useBlockProps();

// CORRECT (save.js)
const blockProps = useBlockProps.save();
```

---

## ✅ Pre-Generation Checklist

### React code:

- [ ] context7 was used to check the API
- [ ] Imports from @wordpress/\* are current
- [ ] useBlockProps() is applied correctly
- [ ] edit.js and save.js have an identical structure (both WITH `__container`)
- [ ] All strings via \_\_()
- [ ] RichText for editable text

### Structure:

- [ ] block.json with apiVersion: 3
- [ ] Correct supports
- [ ] Attributes are defined correctly
- [ ] Style files are included

---

## 📚 Useful Links

- Block Editor Handbook: https://developer.wordpress.org/block-editor/
- Block API Reference: https://developer.wordpress.org/block-editor/reference-guides/block-api/
- Components: https://developer.wordpress.org/block-editor/reference-guides/components/
