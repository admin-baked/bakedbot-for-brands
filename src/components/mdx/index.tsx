import { ReactNode } from 'react';

export const components = {
  // Styled HTML elements
  h1: (props: any) => (
    <h1 className="text-4xl font-bold mb-6 mt-8 first:mt-0" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-3xl font-semibold mt-8 mb-4 border-b pb-2" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold mt-6 mb-3" {...props} />
  ),
  p: (props: any) => <p className="mb-4 leading-relaxed text-gray-700" {...props} />,
  code: (props: any) => (
    <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono text-pink-600" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-6 text-sm" {...props} />
  ),
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
  li: (props: any) => <li className="text-gray-700" {...props} />,
  a: (props: any) => (
    <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props} />
  ),

  // Custom components
  Callout: ({
    type = 'info',
    children,
  }: {
    type?: 'info' | 'warning' | 'success' | 'tip';
    children: ReactNode;
  }) => {
    const styles = {
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'ℹ️',
      },
      warning: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        icon: '⚠️',
      },
      success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        icon: '✅',
      },
      tip: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        icon: '💡',
      },
    };

    const style = styles[type];

    return (
      <div
        className={`${style.bg} ${style.border} ${style.text} border-l-4 p-4 mb-6 rounded-r`}
      >
        <div className="flex gap-3">
          <span className="text-xl flex-shrink-0">{style.icon}</span>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    );
  },

  Tabs: ({ children }: { children: ReactNode }) => (
    <div className="border rounded-lg mb-6 overflow-hidden">{children}</div>
  ),

  Tab: ({ label, children }: { label: string; children: ReactNode }) => (
    <details className="border-b last:border-b-0">
      <summary className="p-4 cursor-pointer font-medium hover:bg-gray-50 select-none">
        {label}
      </summary>
      <div className="p-4 bg-gray-50">{children}</div>
    </details>
  ),

  VideoEmbed: ({ url, title }: { url: string; title: string }) => (
    <div className="aspect-video mb-6 rounded-lg overflow-hidden shadow-lg">
      <iframe
        src={url}
        title={title}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  ),

  StepByStep: ({ steps }: { steps: string[] }) => (
    <ol className="space-y-6 mb-6">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {i + 1}
          </span>
          <div className="flex-1 pt-1">{step}</div>
        </li>
      ))}
    </ol>
  ),
};
