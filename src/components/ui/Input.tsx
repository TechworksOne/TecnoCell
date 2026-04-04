import React from 'react';

const Input = React.forwardRef<HTMLInputElement, { placeholder?: string; value?: string; onChange?: any; type?: string } & any>(
  (props, ref) => {
    return <input ref={ref} className="border rounded-lg p-2 bg-white" {...props} />;
  }
);

Input.displayName = 'Input';

export default Input;
