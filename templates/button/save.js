/**
 * WordPress dependencies
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';

/**
 * Block Save Component
 */
export default function save({ attributes }) {
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

	const blockProps = useBlockProps.save({
		className: `{{NAMESPACE}}-{{BLOCK_NAME}} {{NAMESPACE}}-{{BLOCK_NAME}}--size-${buttonSize} {{NAMESPACE}}-{{BLOCK_NAME}}--${buttonVariant}`,
		style: buttonStyle,
	});

	return (
		<section {...blockProps}>
			<div className='{{NAMESPACE}}-{{BLOCK_NAME}}__container'>
				<div className='{{NAMESPACE}}-{{BLOCK_NAME}}__body'>
					<a className='{{NAMESPACE}}-{{BLOCK_NAME}}__link' href={buttonUrl || '#'} target={buttonTarget} rel={buttonTarget === '_blank' ? 'noopener noreferrer' : undefined}>
						<RichText.Content tagName='span' className='{{NAMESPACE}}-{{BLOCK_NAME}}__text' value={buttonText} />
						{showIcon && (
							<span className='{{NAMESPACE}}-{{BLOCK_NAME}}__icon-wrapper'>
								<svg className='{{NAMESPACE}}-{{BLOCK_NAME}}__icon' width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
									<path d='M5 12H19M19 12L12 5M19 12L12 19' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
								</svg>
							</span>
						)}
					</a>
				</div>
			</div>
		</section>
	);
}
