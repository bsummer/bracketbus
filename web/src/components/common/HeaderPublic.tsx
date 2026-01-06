import { Link } from 'react-router-dom';
import './Header.css';

const HeaderPublic = () => {

    return (
        <header className="public-header">
            <div className="public-header-content">
            <Link to="/" className="public-logo">
                BracketBus
            </Link>
            <Link to="/login" className="public-login-link">
                Login
            </Link>
            </div>
        </header>
    );
};

export default HeaderPublic;