import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { AuthModalProvider } from './components/auth/AuthModalProvider.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<AuthModalProvider>
					<ToastProvider>
						<ConfirmProvider>
							<App />
						</ConfirmProvider>
					</ToastProvider>
				</AuthModalProvider>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
);
