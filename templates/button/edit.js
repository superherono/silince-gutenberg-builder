/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, BlockControls, RichText, useSettings } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl, SelectControl, ColorPalette, ToolbarDropdownMenu } from '@wordpress/components';
import { alignLeft, alignCenter, alignRight } from '@wordpress/icons';

/**
 * Block Edit Component
 */
export default function Edit({ attributes, setAttributes }) {
	const { buttonText, buttonUrl, buttonTarget, backgroundColor, backgroundColorHover, textColor, iconBackgroundColor, iconColor, showIcon, justifyContent, style, buttonSize, buttonVariant, buttonFontSize } = attributes;

	// Get border radius from style object — null when unset (variant drives it)
	const getBorderRadius = () => {
		const radius = style?.border?.radius;
		if (!radius) return null;
		if (typeof radius === 'string') return radius;
		if (typeof radius === 'object') {
			return radius.topLeft || Object.values(radius)[0] || null;
		}
		return null;
	};

	// Get font size from buttonFontSize attribute — null when unset (variant drives it)
	const getFontSize = () => {
		return buttonFontSize || null;
	};

	const [themeColors] = useSettings('color.palette');
	const [themeFontSizes] = useSettings('typography.fontSizes');

	const colorPalette = [...(themeColors || [])];

	// Font-size options come from the theme's design system (theme.json → typography.fontSizes),
	// value = the theme alias var(--text-{slug}) so the size resolves through the design system.
	// Narrowed to button-role sizes (slug `button-*`); if the theme defines none, fall back to all
	// non-display sizes so the control is never empty. "Default (variant)" ('') = no override.
	const allFontSizes = themeFontSizes || [];
	const buttonFontSizes = allFontSizes.filter((f) => /^button(-|$)/.test(f.slug));
	const fontSizeSource = buttonFontSizes.length ? buttonFontSizes : allFontSizes.filter((f) => !/^display-/.test(f.slug));
	const fontSizeOptions = [
		{ label: __('Default (variant)', '{{TEXTDOMAIN}}'), value: '' },
		...fontSizeSource.map((f) => ({ label: f.name, value: `var(--text-${f.slug})` })),
	];

	// Runtime overrides — set a CSS var ONLY when the user actually picked a value.
	// Otherwise the variant/size class drives it (an inline style would clobber the class).
	const buttonStyle = { justifyContent };
	const borderRadius = getBorderRadius();
	const fontSize = getFontSize();
	if (backgroundColor) buttonStyle['--button-bg-color'] = backgroundColor;
	if (backgroundColorHover) buttonStyle['--button-bg-color-hover'] = backgroundColorHover;
	if (textColor) buttonStyle['--button-text-color'] = textColor;
	if (iconBackgroundColor) buttonStyle['--button-icon-bg'] = iconBackgroundColor;
	if (iconColor) buttonStyle['--button-icon-color'] = iconColor;
	if (borderRadius) buttonStyle['--button-border-radius'] = borderRadius;
	if (fontSize) buttonStyle['--button-font-size'] = fontSize;

	const blockProps = useBlockProps({
		className: `{{NAMESPACE}}-{{BLOCK_NAME}} {{NAMESPACE}}-{{BLOCK_NAME}}--size-${buttonSize} {{NAMESPACE}}-{{BLOCK_NAME}}--${buttonVariant}`,
		style: buttonStyle,
	});

	const justifyIcons = {
		'flex-start': alignLeft,
		center: alignCenter,
		'flex-end': alignRight,
	};

	return (
		<>
			<BlockControls>
				<ToolbarDropdownMenu
					icon={justifyIcons[justifyContent]}
					label={__('Change button alignment', '{{TEXTDOMAIN}}')}
					controls={[
						{
							title: __('Align left', '{{TEXTDOMAIN}}'),
							icon: alignLeft,
							onClick: () => setAttributes({ justifyContent: 'flex-start' }),
							isActive: justifyContent === 'flex-start',
						},
						{
							title: __('Align center', '{{TEXTDOMAIN}}'),
							icon: alignCenter,
							onClick: () => setAttributes({ justifyContent: 'center' }),
							isActive: justifyContent === 'center',
						},
						{
							title: __('Align right', '{{TEXTDOMAIN}}'),
							icon: alignRight,
							onClick: () => setAttributes({ justifyContent: 'flex-end' }),
							isActive: justifyContent === 'flex-end',
						},
					]}
				/>
			</BlockControls>

			<InspectorControls>
				<PanelBody title={__('Link Settings', '{{TEXTDOMAIN}}')} initialOpen={true}>
					<TextControl label={__('Button Text', '{{TEXTDOMAIN}}')} value={buttonText} onChange={(value) => setAttributes({ buttonText: value })} help={__('Enter the button text', '{{TEXTDOMAIN}}')} />
					<TextControl label={__('Button URL', '{{TEXTDOMAIN}}')} value={buttonUrl} onChange={(value) => setAttributes({ buttonUrl: value })} help={__('Enter the button destination URL', '{{TEXTDOMAIN}}')} type='url' />
					<SelectControl
						label={__('Open in', '{{TEXTDOMAIN}}')}
						value={buttonTarget}
						options={[
							{ label: __('Same window', '{{TEXTDOMAIN}}'), value: '_self' },
							{ label: __('New window', '{{TEXTDOMAIN}}'), value: '_blank' },
						]}
						onChange={(value) => setAttributes({ buttonTarget: value })}
					/>
				</PanelBody>

				<PanelBody title={__('Button Style', '{{TEXTDOMAIN}}')} initialOpen={false}>
					<SelectControl
						label={__('Button Size', '{{TEXTDOMAIN}}')}
						value={buttonSize}
						options={[
							{ label: __('Small', '{{TEXTDOMAIN}}'), value: 'small' },
							{ label: __('Medium', '{{TEXTDOMAIN}}'), value: 'medium' },
							{ label: __('Large', '{{TEXTDOMAIN}}'), value: 'large' },
						]}
						onChange={(value) => setAttributes({ buttonSize: value })}
					/>
					<SelectControl
						label={__('Button Variant', '{{TEXTDOMAIN}}')}
						value={buttonVariant}
						options={[
							{ label: __('Primary', '{{TEXTDOMAIN}}'), value: 'primary' },
							{ label: __('Secondary', '{{TEXTDOMAIN}}'), value: 'secondary' },
							{ label: __('Tertiary', '{{TEXTDOMAIN}}'), value: 'tertiary' },
							{ label: __('Text', '{{TEXTDOMAIN}}'), value: 'text' },
						]}
						onChange={(value) => setAttributes({ buttonVariant: value })}
					/>
					<SelectControl
						label={__('Font Size', '{{TEXTDOMAIN}}')}
						value={buttonFontSize}
						options={fontSizeOptions}
						onChange={(value) => setAttributes({ buttonFontSize: value })}
						help={__('Design-system sizes from the theme. "Default (variant)" lets the button variant/size set the text size.', '{{TEXTDOMAIN}}')}
					/>
				</PanelBody>

				<PanelBody title={__('Button Colors', '{{TEXTDOMAIN}}')} initialOpen={false}>
					<p>{__('Background Color', '{{TEXTDOMAIN}}')}</p>
					<ColorPalette colors={colorPalette} value={backgroundColor} onChange={(value) => setAttributes({ backgroundColor: value })} />
					<p>{__('Background Color (Hover)', '{{TEXTDOMAIN}}')}</p>
					<ColorPalette colors={colorPalette} value={backgroundColorHover} onChange={(value) => setAttributes({ backgroundColorHover: value })} />
					<p>{__('Text Color', '{{TEXTDOMAIN}}')}</p>
					<ColorPalette colors={colorPalette} value={textColor} onChange={(value) => setAttributes({ textColor: value })} />
				</PanelBody>

				<PanelBody title={__('Icon Settings', '{{TEXTDOMAIN}}')} initialOpen={false}>
					<ToggleControl label={__('Show Icon', '{{TEXTDOMAIN}}')} checked={showIcon} onChange={(value) => setAttributes({ showIcon: value })} help={__('Toggle to show or hide the icon', '{{TEXTDOMAIN}}')} />
					{showIcon && (
						<>
							<p>{__('Icon Background Color', '{{TEXTDOMAIN}}')}</p>
							<ColorPalette colors={colorPalette} value={iconBackgroundColor} onChange={(value) => setAttributes({ iconBackgroundColor: value })} />
							<p>{__('Icon Color', '{{TEXTDOMAIN}}')}</p>
							<ColorPalette colors={colorPalette} value={iconColor} onChange={(value) => setAttributes({ iconColor: value })} />
						</>
					)}
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div className='{{NAMESPACE}}-{{BLOCK_NAME}}__link'>
					<RichText tagName='span' className='{{NAMESPACE}}-{{BLOCK_NAME}}__text' value={buttonText} onChange={(value) => setAttributes({ buttonText: value })} placeholder={__('Enter button text...', '{{TEXTDOMAIN}}')} allowedFormats={[]} />
					{showIcon && (
						<span className='{{NAMESPACE}}-{{BLOCK_NAME}}__icon-wrapper'>
							<svg className='{{NAMESPACE}}-{{BLOCK_NAME}}__icon' width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
								<path d='M5 12H19M19 12L12 5M19 12L12 19' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
							</svg>
						</span>
					)}
				</div>
			</div>
		</>
	);
}
