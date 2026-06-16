/**
 * Shared Markdown list component customizations for react-markdown.
 * Provides custom ul/ol/li renderers with dynamic padding based on nesting depth.
 */
const markdownListComponents = {
  ul({ depth, ordered, className, children, ...props }) {
    return (
      <ul
        className={`list-disc pl-6 ${className}`}
        style={{ paddingLeft: depth * 20 + 'px' }}
        {...props}
      >
        {children}
      </ul>
    );
  },
  ol({ depth, ordered, className, children, ...props }) {
    return (
      <ol
        className={`list-decimal pl-6 ${className}`}
        style={{ paddingLeft: depth * 20 + 'px' }}
        {...props}
      >
        {children}
      </ol>
    );
  },
  li({ className, children, ...props }) {
    return (
      <li className={`mb-2 ${className}`} {...props}>
        {children}
      </li>
    );
  }
};

export default markdownListComponents;
