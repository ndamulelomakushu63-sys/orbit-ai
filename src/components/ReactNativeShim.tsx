import React from 'react';

// React Native to Web compatibility shims.
// When porting this to a raw Expo CLI project, replace:
//   import { ... } from '../components/ReactNativeShim';
// with:
//   import { ... } from 'react-native';

interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const View: React.FC<ViewProps> = ({ children, className = '', style, id, ...props }) => {
  return (
    <div 
      id={id}
      className={`flex flex-col relative ${className}`} 
      style={style} 
      {...props}
    >
      {children}
    </div>
  );
};

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({ children, className = '', style, ...props }) => {
  return (
    <span 
      className={`font-sans antialiased text-slate-800 ${className}`} 
      style={style} 
      {...props}
    >
      {children}
    </span>
  );
};

interface SafeAreaViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({ children, className = '', style, ...props }) => {
  return (
    <div 
      className={`flex flex-col h-full w-full pb-2 ${className}`} 
      style={{
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        ...style
      }} 
      {...props}
    >
      {children}
    </div>
  );
};

interface ScrollViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  contentContainerClassName?: string;
  showsVerticalScrollIndicator?: boolean;
}

export const ScrollView: React.FC<ScrollViewProps> = ({ 
  children, 
  className = '', 
  contentContainerClassName = '',
  showsVerticalScrollIndicator = true,
  style, 
  ...props 
}) => {
  const scrollbarStyle = !showsVerticalScrollIndicator ? { scrollbarWidth: 'none' as const } : {};
  return (
    <div 
      className={`flex-1 overflow-y-auto min-h-0 ${className}`} 
      style={{ ...scrollbarStyle, ...style }}
      {...props}
    >
      <div className={`flex flex-col ${contentContainerClassName}`}>
        {children}
      </div>
    </div>
  );
};

interface TouchableOpacityProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  activeOpacity?: number;
}

export const TouchableOpacity: React.FC<TouchableOpacityProps> = ({ 
  children, 
  className = '', 
  activeOpacity = 0.7,
  style, 
  ...props 
}) => {
  return (
    <button 
      className={`transition-opacity duration-150 active:opacity-60 cursor-pointer focus:outline-none flex items-center justify-center ${className}`} 
      style={{ ...style }}
      {...props}
    >
      {children}
    </button>
  );
};

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  placeholderTextColor?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  onChange?: (e: any) => void;
}

export const TextInput: React.FC<TextInputProps> = ({ 
  className = '', 
  placeholderTextColor,
  onChangeText,
  keyboardType,
  secureTextEntry,
  multiline,
  numberOfLines,
  style, 
  value,
  onChange,
  ...props 
}) => {
  // Translate keyboardType to native input type
  let inputType = 'text';
  if (secureTextEntry) {
    inputType = 'password';
  } else if (keyboardType === 'numeric' || keyboardType === 'number-pad') {
    inputType = 'number';
  } else if (keyboardType === 'email-address') {
    inputType = 'email';
  } else if (keyboardType === 'phone-pad') {
    inputType = 'tel';
  }

  // Handle change event to support onChangeText
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (onChangeText) {
      onChangeText(text);
    }
    if (onChange) {
      onChange(e);
    }
  };

  // Filter out any custom React Native properties that aren't valid for the DOM
  const {
    autoCapitalize,
    ...domProps
  } = props;

  if (multiline) {
    return (
      <textarea
        className={`font-sans bg-transparent outline-none w-full border-none p-0 text-slate-800 ${className}`}
        style={style}
        value={value}
        onChange={handleChange}
        rows={numberOfLines}
        {...(domProps as any)}
      />
    );
  }

  return (
    <input 
      type={inputType}
      className={`font-sans bg-transparent outline-none w-full border-none p-0 text-slate-800 ${className}`} 
      style={style} 
      value={value}
      onChange={handleChange}
      {...(domProps as any)}
    />
  );
};

interface FlatListProps<T> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  ListEmptyComponent?: React.ReactNode;
  ItemSeparatorComponent?: React.FC;
  contentContainerClassName?: string;
}

export function FlatList<T>({ 
  data, 
  renderItem, 
  keyExtractor, 
  className = '', 
  ListEmptyComponent,
  ItemSeparatorComponent,
  contentContainerClassName = ''
}: FlatListProps<T>) {
  if (data.length === 0 && ListEmptyComponent) {
    return <div className={`flex flex-col ${className}`}>{ListEmptyComponent}</div>;
  }

  return (
    <div className={`flex-1 overflow-y-auto min-h-0 ${className}`}>
      <div className={`flex flex-col ${contentContainerClassName}`}>
        {data.map((item, index) => (
          <React.Fragment key={keyExtractor(item, index)}>
            {renderItem({ item, index })}
            {ItemSeparatorComponent && index < data.length - 1 && <ItemSeparatorComponent />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Emulated Navigation Props for Screens hook simulation
export interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace: (screen: string, params?: any) => void;
}
