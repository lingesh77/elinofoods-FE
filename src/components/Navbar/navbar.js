import { useState, useEffect, useRef } from "react";
import "./navbar.css";
import {
  FaUserCircle,
  FaShoppingBag,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosArrowDown } from "react-icons/io";
import { useCart } from "../CartContext";
import { useAuth } from "../../auth/AuthContext";
import shopifyService from "../../services/shopifyService";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activePath, setActivePath] = useState(window.location.pathname);

  const { customer, logout, isAuthenticated, loading: authLoading } = useAuth();
  const profileDropdownRef = useRef(null);

  const { getTotalItems, setIsCartOpen } = useCart();

  const dropdown = {
    link: ["Bar Blast", "Fruit Jerky"],
  };

  // Product fetching states
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(null);
  const[dropdownitems,setDropdownitems]=useState([])

  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    const fetchProducts = async () => {
      if (!searchTerm) {
        setProducts([]);
        return;
      }
      try {
        setProductLoading(true);
        setProductError(null);
        const allProducts = await shopifyService.getProducts();
        const filteredProducts = allProducts.filter((edge) => {
          const node = edge.node || edge;
          return node.title.toLowerCase().includes(searchTerm.toLowerCase());
        }).slice(0, 5);
        if (!ignore) setProducts(filteredProducts);
      } catch (err) {
        if (!ignore) setProductError(err.message || "Error fetching products");
      } finally {
        if (!ignore) setProductLoading(false);
      }
    };
    fetchProducts();
    return () => { ignore = true; };
  }, [searchTerm]);
  useEffect(()=>{
    const fetchProductscategory = async () => {
      try{
        const allProducts = await shopifyService.getProducts();
       
        const categories = new Set();
        allProducts.forEach((edge) => {
          const node = edge.node || edge;
          node.handle && categories.add(node.handle);
        });

        setDropdownitems(Array.from(categories));




      }catch(err){
        console.error(err)
      }

    }
    fetchProductscategory();

  },[])
  const toggleMenu = () => setIsOpen((val) => !val);
  const openCart = () => setIsCartOpen(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileDropdown(false);
      navigate("/");
    } catch (error) {
      setShowProfileDropdown(false);
      navigate("/");
    }
  };

  const handleProfileClick = () => {
    if (isAuthenticated && customer) {
      navigate("/profile");
    } else {
      navigate("/login");
    }
    setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  useEffect(() => {
    const handlePathChange = () => setActivePath(window.location.pathname);
    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  // Helper to extract numeric ID from Shopify GID string
  const extractProductId = (gid) => {
    // gid format: "gid://shopify/Product/10145848099128"
    if (!gid) return null;
    const parts = gid.split("/");
    return parts.length > 0 ? parts[parts.length -1] : null;
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <h4>Elino Foods</h4>
        <div className="search-bar" style={{ position: "relative" }}>
          <i className="fa fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search your products here..."
            className="place"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
          {searchTerm && (
            <div className="autocomplete-dropdown" style={{
              position: "absolute", top: "110%", left: 0, width: "100%",
              background: "white", boxShadow: "0 2px 8px #eee", zIndex: 100
            }}>
              {productLoading && (
                <div style={{ padding: "10px 12px" }}>Loading...</div>
              )}
              {productError && (
                <div style={{ color:"red", padding: "10px 12px" }}>{productError}</div>
              )}
              {!productLoading && products.length === 0 && !productError && (
                <div className="not-found" style={{ padding: "10px 12px" }}>No products found</div>
              )}
              {products.map((edge, idx) => {
                const node = edge.node || edge;
                const numericId = extractProductId(node.id);
                return (
                  <div
                    key={node.id || idx}
                    className="autocomplete-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      padding: "8px 10px",
                      borderBottom: "1px solid #eee"
                    }}
                    onClick={() => {
                      setSearchTerm("");
                      // Navigate to route using numeric ID extracted from gid
                      if (numericId) {
                        navigate(`/products/${numericId}`);
                      }
                    }}
                  >
                    <img
                      src={node.images?.edges?.[0]?.node?.url || "/assets/logo.png"}
                      alt={node.title}
                      style={{
                        width: 28,
                        height: 28,
                        objectFit: "cover",
                        borderRadius: "6px",
                        marginRight: 10,
                        background: "#fafafa"
                      }}
                      onError={(e) => (e.currentTarget.src = "/assets/logo.png")}
                    />
                    <span>{node.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={`nav-links ${isOpen ? "open" : ""}`}>
        <a href="/" className={activePath === "/" ? "active" : ""}>
          Home
        </a>

        <div
          className="dropdown-wrapper"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <a
            href="./products"
            className={activePath === "/products" ? "active" : ""}
          >
            Products
            <IoIosArrowDown
              style={{ marginLeft: "5px", position: "relative", top: "3px" }}
              size={16}
            />
          </a>
          {showDropdown && (
            <div className="dropdown-content">
              <p
                style={{
                  fontWeight: "bold",
                  textAlign: "left",
                  marginLeft: "10px",
                }}
              >
                Search by Categories
              </p>
              {dropdownitems.map((item, index) => (
                <a
                  key={index}
                  href={`/products?category=${item
                    .toLowerCase()
                    .replace(" ", "-")}`}
                  className="dropdown-item"
                >
                  {item}
                </a>
              ))}
            </div>
          )}
        </div>

        <a href="#blog" className={activePath.includes("blog") ? "active" : ""}>
          Blog
        </a>
        <a
          href="#about"
          className={activePath.includes("about") ? "active" : ""}
        >
          About Us
        </a>
      </div>

      <div className="nav-icons">
        {/* Cart Button with Badge */}
        <button className="cart-btn" onClick={openCart}>
          <FaShoppingBag />
          {getTotalItems() > 0 && (
            <span className="cart-badge">{getTotalItems()}</span>
          )}
        </button>

        {/* Profile Button with Dropdown */}
        <div className="profile-wrapper" ref={profileDropdownRef}>
          <button className="profile-btn" onClick={toggleProfileDropdown}>
            <FaUserCircle />
            {isAuthenticated && customer ? (
              <span className="profile-name">
                {customer.firstName || "Account"}
              </span>
            ) : (
              <span className="profile-name">Guest</span>
            )}
            <IoIosArrowDown
              className={`profile-arrow ${
                showProfileDropdown ? "rotated" : ""
              }`}
              size={14}
            />
          </button>

          {showProfileDropdown && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                {isAuthenticated && customer ? (
                  <div className="customer-info">
                    <span className="customer-name">
                      {customer.firstName} {customer.lastName}
                    </span>
                    <span className="customer-email">{customer.email}</span>
                  </div>
                ) : (
                  <span className="guest-text">Welcome, Guest!</span>
                )}
              </div>
              <div className="profile-dropdown-divider"></div>
              {isAuthenticated && customer ? (
                <>
                  <button
                    className="profile-dropdown-item"
                    onClick={handleProfileClick}
                  >
                    <FaUser className="dropdown-icon" />
                    View Profile
                  </button>
                  <button
                    className="profile-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="dropdown-icon" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  className="profile-dropdown-item"
                  onClick={handleProfileClick}
                >
                  <FaUser className="dropdown-icon" />
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>

        <button className="hamburger" onClick={toggleMenu}>
          <GiHamburgerMenu />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
