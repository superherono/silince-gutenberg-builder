# WordPress Coding Standards & Security

System prompt for agents on WordPress coding standards (PHP).

---

## 🔍 Checking That Information Is Current

**CRITICAL:** When generating PHP code for WordPress:

- ✅ **MUST use context7** to check current WordPress functions
- ✅ Add "use context7" to the prompt when generating render.php
- ✅ Check that escaping functions are used correctly
- ✅ Cross-check the current API for `get_block_wrapper_attributes()`
- ✅ Check security functions (`wp_kses_post`, `esc_html`, etc.)

**Example prompt:**
```
use context7

Create render.php for the hero block with dynamic content.
Check the current escaping functions and get_block_wrapper_attributes.
```

---

## 🔒 Security

### 1. ABSPATH check

**REQUIRED** at the start of every PHP file:

```php
<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}
```

**Why:** Prevents direct access to PHP files.

---

### 2. Output escaping

**ALWAYS escape data on output!**

#### Main functions:

```php
// HTML content (allows safe HTML tags)
echo wp_kses_post($content);

// Plain text (strips all HTML)
echo esc_html($text);

// HTML attributes
echo '<div class="' . esc_attr($class_name) . '">';

// URL
echo '<a href="' . esc_url($url) . '">';

// JavaScript
echo '<script>var data = ' . wp_json_encode($data) . ';</script>';

// Textarea
echo '<textarea>' . esc_textarea($value) . '</textarea>';
```

#### What to use when:

| Function | When to use | Example |
|---------|-------------------|---------|
| `esc_html()` | Plain text | `<p><?php echo esc_html($title); ?></p>` |
| `wp_kses_post()` | Content with HTML | `<?php echo wp_kses_post($content); ?>` |
| `esc_attr()` | HTML attributes | `<div data-id="<?php echo esc_attr($id); ?>">` |
| `esc_url()` | URL in href/src | `<a href="<?php echo esc_url($link); ?>">` |
| `esc_js()` | JavaScript strings | `onclick="alert('<?php echo esc_js($msg); ?>')"`|

---

### 3. Sanitization (cleaning input data)

**Sanitize data on input:**

```php
// Text (strips HTML tags and special characters)
$text = sanitize_text_field($_POST['text']);

// Email
$email = sanitize_email($_POST['email']);

// URL
$url = esc_url_raw($_POST['url']);

// HTML content (allows safe tags)
$content = wp_kses_post($_POST['content']);

// Numbers
$number = absint($_POST['count']); // Positive integer
$number = intval($_POST['id']);    // Any integer
$number = floatval($_POST['price']); // Float

// Arrays
$ids = array_map('absint', $_POST['ids']);
```

---

### 4. SQL Security

**ALWAYS use `$wpdb->prepare()`:**

```php
global $wpdb;

// Correct - with placeholders
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_type = %s AND ID = %d",
        $post_type,
        $post_id
    )
);

// Placeholders:
// %s - string
// %d - integer
// %f - float
```

❌ **DO NOT use:**
```php
// DANGEROUS! SQL injection!
$results = $wpdb->get_results(
    "SELECT * FROM {$wpdb->posts} WHERE ID = {$_GET['id']}"
);
```

---

### 5. Nonce check (for forms and AJAX)

```php
// Creating a nonce
wp_nonce_field('my_action', 'my_nonce');

// Verifying the nonce
if (!wp_verify_nonce($_POST['my_nonce'], 'my_action')) {
    wp_die('Security check failed');
}

// For AJAX
check_ajax_referer('my_action', 'my_nonce');
```

---

## 📝 PHP Syntax and Formatting

### 1. Opening tags

```php
<?php
// ALWAYS the full form
// DO NOT use short tags <? or <?=
```

---

### 2. Indentation and spaces

**Rules:**
- **Tabs** for indentation at the start of lines
- **Spaces** for alignment within lines
- Spaces around operators and after commas

```php
<?php
// Correct
if ( $condition ) {
→   $result = $foo && $bar;
→   do_something( $param1, $param2 );
}

// Incorrect
if($condition){
    $result=$foo&&$bar;
    do_something($param1,$param2);
}
```

---

### 3. Braces

**ALWAYS use braces, even for single-line blocks:**

```php
// Correct
if ( $condition ) {
    do_something();
}

// Incorrect
if ( $condition )
    do_something();
```

**Opening brace on the same line:**

```php
// Correct
if ( $condition ) {
    // code
}

function my_function() {
    // code
}

// Incorrect
if ( $condition )
{
    // code
}
```

---

### 4. Quotes

```php
// Single quotes for simple strings
$string = 'simple string';
$array_key = $data['key'];

// Double quotes for interpolation
$string = "Hello {$name}";
$string = "Value: {$data['key']}";

// Concatenation with spaces around the dot
$full_name = $first_name . ' ' . $last_name;
```

---

### 5. Yoda conditions

**Put constants/literals on the LEFT of the operator:**

```php
// Correct (Yoda style)
if ( true === $is_active ) {}
if ( 'yes' === $value ) {}
if ( 10 < $count ) {}

// Incorrect
if ( $is_active === true ) {}
if ( $value === 'yes' ) {}
```

**Why:** Prevents the accidental assignment error `if ( $var = true )`.

---

### 6. Alternative syntax in templates

```php
<!-- Correct for HTML templates -->
<?php if ( $condition ) : ?>
    <div>Content</div>
<?php endif; ?>

<?php foreach ( $items as $item ) : ?>
    <li><?php echo esc_html( $item ); ?></li>
<?php endforeach; ?>

<!-- DO NOT use braces in HTML -->
<?php if ( $condition ) { ?>
    <div>Content</div>
<?php } ?>
```

---

### 7. Arrays

**Use the long `array()` syntax:**

```php
// Correct (WordPress standard)
$items = array( 1, 2, 3 );
$data = array(
    'key1' => 'value1',
    'key2' => 'value2',
);

// Incorrect
$items = [ 1, 2, 3 ];
```

**Associative arrays - each element on a new line:**

```php
$args = array(
    'post_type'      => 'post',
    'posts_per_page' => 10,
    'orderby'        => 'date',
    'order'          => 'DESC',
);
```

---

### 8. What NOT to use

❌ **Forbidden:**

```php
// @ error suppression
@include 'file.php'; // NO!

// extract() - makes the code harder to understand
extract( $_POST ); // NO!

// Short tags
<? echo $var; ?> // NO!

// else if (use elseif)
else if ( $condition ) {} // NO!

// Short array syntax
$arr = [ 1, 2, 3 ]; // NO!
```

---

## 🎯 Naming Conventions

### Naming table:

| Element | Rule | Example |
|---------|---------|---------|
| **Functions** | snake_case with a prefix | `mytheme_get_title()` |
| **Variables** | snake_case | `$my_variable` |
| **Classes** | PascalCase with underscores | `MyTheme_Block_Manager` |
| **Constants** | UPPER_CASE | `MYTHEME_VERSION` |
| **Files** | lowercase with hyphens | `my-template.php` |
| **Class files** | class-name.php | `class-wp-error.php` |
| **Hooks** | snake_case with a prefix | `mytheme_after_header` |

### Prefixes

**ALWAYS use a prefix** to avoid conflicts:

```php
// Functions
function mytheme_get_post_title() {}

// Variables (global)
global $mytheme_settings;

// Constants
define( 'MYTHEME_VERSION', '1.0.0' );

// Hooks
do_action( 'mytheme_after_content' );
```

---

## 🔧 render.php for Gutenberg Blocks

### Base template:

```php
<?php
/**
 * Render template for Block Name
 *
 * @package Theme_Name
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Get attributes with defaults (use ??)
$title   = $attributes['title'] ?? '';
$content = $attributes['content'] ?? '';
$items   = $attributes['items'] ?? array();

// Get wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes(
    array(
        'class' => 'wp-block-namespace-blockname',
    )
);
?>

<div <?php echo $wrapper_attributes; ?>>
    <section class="block-name">
        <div class="block-name__container">

            <?php if ( ! empty( $title ) ) : ?>
                <h2 class="block-name__title">
                    <?php echo wp_kses_post( $title ); ?>
                </h2>
            <?php endif; ?>

            <?php if ( ! empty( $content ) ) : ?>
                <div class="block-name__content">
                    <?php echo wp_kses_post( $content ); ?>
                </div>
            <?php endif; ?>

            <?php if ( ! empty( $items ) && is_array( $items ) ) : ?>
                <div class="block-name__items">
                    <?php foreach ( $items as $item ) : ?>
                        <div class="block-name__item">
                            <?php echo esc_html( $item['title'] ?? '' ); ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

        </div>
    </section>
</div>
```

### Required render.php rules:

1. ✅ `ABSPATH` check
2. ✅ PHPDoc comment
3. ✅ `get_block_wrapper_attributes()`
4. ✅ Default values for attributes (`??`)
5. ✅ `!empty()` check before output
6. ✅ Escaping of all output data
7. ✅ Structure with the `__container` element
8. ✅ Alternative syntax (`if/endif`, `foreach/endforeach`)
9. ✅ Yoda style for conditions
10. ✅ Spaces around parentheses and operators

---

## ⚠️ Common Errors

### ❌ Error 1: Output not escaped

```php
// DANGEROUS!
echo $title;
echo '<div class="' . $class . '">';

// CORRECT
echo esc_html( $title );
echo '<div class="' . esc_attr( $class ) . '">';
```

---

### ❌ Error 2: Forgot ABSPATH

```php
// INCORRECT
<?php
$title = 'Hello';

// CORRECT
<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
$title = 'Hello';
```

---

### ❌ Error 3: Short tags

```php
// INCORRECT
<? echo $var; ?>
<?= $var ?>

// CORRECT
<?php echo esc_html( $var ); ?>
```

---

### ❌ Error 4: Direct SQL queries

```php
// DANGEROUS!
$wpdb->query( "DELETE FROM {$wpdb->posts} WHERE ID = {$_GET['id']}" );

// CORRECT
$wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->posts} WHERE ID = %d",
        absint( $_GET['id'] )
    )
);
```

---

### ❌ Error 5: No default values

```php
// INCORRECT (Notice if the key is missing)
$title = $attributes['title'];

// CORRECT
$title = $attributes['title'] ?? '';
$title = isset( $attributes['title'] ) ? $attributes['title'] : '';
```

---

### ❌ Error 6: Wrong style

```php
// INCORRECT
if($condition){
    $result=$foo&&$bar;
}

// CORRECT
if ( $condition ) {
    $result = $foo && $bar;
}
```

---

## ✅ PHP Code Checklist

### Security:
- [ ] `ABSPATH` check at the start of the file
- [ ] All output data is escaped
- [ ] The correct escaping functions are used
- [ ] Default values for attributes (`??`)
- [ ] `!empty()` check before outputting arrays/objects
- [ ] SQL queries via `$wpdb->prepare()`

### Structure:
- [ ] PHPDoc comments
- [ ] `get_block_wrapper_attributes()` for the wrapper
- [ ] Structure with the `__container` element
- [ ] Alternative syntax in HTML (`if/endif`)

### Formatting:
- [ ] Full opening tags `<?php`
- [ ] Spaces around parentheses and operators
- [ ] Yoda style for conditions
- [ ] Tabs for indentation
- [ ] Long array syntax `array()`
- [ ] `elseif` instead of `else if`

### Context7:
- [ ] context7 was used to check that functions are current

---

## 📚 Core Principle

> **Readability matters more than brevity.**
> Code is written once but read many times.

---

## 📚 References

- WordPress PHP Coding Standards: https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/
- Data Validation: https://developer.wordpress.org/apis/security/data-validation/
- Escaping: https://developer.wordpress.org/apis/security/escaping/
- WP-Kama PHP Standards: https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/
