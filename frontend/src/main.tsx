import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions : {
    queries : {
      retry :   1,
      staleTime : 1000 * 60 * 5 ,
      refetchOnWindowFocus: false ,

    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App></App>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>

)