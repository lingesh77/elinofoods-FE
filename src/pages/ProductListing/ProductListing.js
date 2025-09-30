import { useEffect, useRef, useState } from "react";
import ColorThief from "colorthief";
import Navbar from "../../components/Navbar/navbar";
import TopBanner from "../../components/TopBanner/TopBanner";
import { GiIceCube } from "react-icons/gi";
import { MdFastfood } from "react-icons/md";
import { FaLeaf } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaStar } from "react-icons/fa";
import "./ProductListing.css";
import Comment from "../../components/Comment/Comments";
import { useCart } from "../../components/CartContext";
import CartSidebar from "../../components/cartSidebar";
import shopifyService from "../../services/shopifyService";
import { useParams, useLocation } from "react-router-dom";
import { AnimatedSection } from "../../hooks/CustomAnimation";
import { useInView } from "../../hooks/CustomAnimation";
import Footer from "../../components/Footer/Footer";

const categoryProductMap = {
  "bar-blast": "tosi",
  "fruit-jerky": "fruit-jerky",
};

export default function Products() {
  const { handle } = useParams();
  console.log("handle:", handle)

   const { id } = useParams();
   console.log("id:", id)
  const { addToCart, setIsCartOpen } = useCart();
  const url=  process.env.REACT_APP_API_URL || "http://localhost:5000/api/shopify"
  const location = useLocation();

  // Refs for color and center fit
  const imgRef = useRef(null);
  const semiCircleRef = useRef(null);
  const centerImgRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const category = searchParams.get("category");
  console.log("category:", category)

  // State
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [otherProducts, setOtherProducts] = useState([]);
  const [otherProductsLoading, setOtherProductsLoading] = useState(false);
  // Add this with your other state declarations
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });

  const [textColor, setTextColor] = useState("#000");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bgColor, setBgColor] = useState("white");
  const [count, setCount] = useState(1);

  // Portrait fitting state
  const [isPortrait, setIsPortrait] = useState(false);
  const [centerImgStyle, setCenterImgStyle] = useState({});

  // Animation refs using our custom hook
  const [ingredientsRef, ingredientsInView] = useInView({ threshold: 0.2 });
  const [benefitsRef, benefitsInView] = useInView({ threshold: 0.2 });

  const benefits = [
    { id: 1, icon: <GiIceCube />, content: "100% sugar free" },
    { id: 2, icon: <MdFastfood />, content: "Contains no calories" },
    { id: 3, icon: <FaLeaf />, content: "100% natural product." },
  ];

  const ingredients = [
    { name: "Almonds", image: "/assets/almond.png" },
    { name: "Cashews", image: "/assets/cashews.png" },
    { name: "Dates", image: "/assets/dates.png" },
    { name: "Cocoa", image: "/assets/cocoa.png" },
    { name: "Ashwagandha", image: "/assets/ashwagandha.png" },
    { name: "Sea Salt", image: "/assets/sea salt.png" },
  ];

  // Compute current image EARLY so hooks can safely reference it
  const productImages = product?.images?.edges || [];
  const currentImage = productImages[currentIndex]?.node;
  const currentImageUrl = currentImage?.url || ""; // safe for deps

  // Fetch other products (exclude the one we're showing)
  const fetchOtherProducts = async (currentProductId) => {
    try {
      setOtherProductsLoading(true);
      const allProducts = await shopifyService.getProducts();
      const filteredProducts = allProducts
        .filter((edge) => {
          const node = edge.node || edge;
          return node.id !== currentProductId;
        })
        .slice(0, 4);
    
      setOtherProducts(filteredProducts);
    } catch (error) {
      console.error("Error fetching other products:", error);
    } finally {
      setOtherProductsLoading(false);
    }
  };
console.log("fetched product:",otherProducts)
  const fetchProductRating = async (productId) => {
    if (!productId) return;

    try {
      const cleanId = getCleanProductId(productId);
      console.log("Fetching ratings for product ID:", productId);
      console.log("Cleaned ID:", cleanId);


      console.log("Rating fetch URL:", url);

      const response = await fetch(`${url}/reviews/${cleanId}/rating`);

      if (!response.ok) {
        throw new Error(`Failed to fetch rating: ${response.status}`);
      }

      const data = await response.json();
      console.log("Rating data received:", data);

      if (data.success) {
        setReviewStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching product rating:", error);
    }
  };

  // Add this to your useEffect that watches for product changes
  useEffect(() => {
    // Reset review stats when product changes
    setReviewStats({
      averageRating: 0,
      totalReviews: 0,
    });

    // If product is loaded, fetch its ratings
    if (product?.id) {
      fetchProductRating(product.id);
    }
  }, [product?.id]);

  const fitCenterImage = () => {
    const img = centerImgRef.current;
    const wrap = semiCircleRef.current;
    if (!img || !wrap) return;

    const { naturalWidth: nw, naturalHeight: nh } = img;
    if (!nw || !nh) return;

    const portrait = nh > nw;
    setIsPortrait(portrait);

    const { clientWidth: cw, clientHeight: ch } = wrap;

    if (portrait) {
      setCenterImgStyle({
        height: Math.round(ch * 0.82),
        width: "auto",
        maxWidth: Math.round(cw * 0.6),
        objectFit: "contain",
      });
    } else {
      setCenterImgStyle({
        width: Math.round(cw * 0.85),
        height: "auto",
        objectFit: "contain",
      });
    }
  };

  useEffect(() => {
    const img = centerImgRef.current;
    if (img && img.complete && img.naturalWidth) {
      fitCenterImage();
    }
    window.addEventListener("resize", fitCenterImage);
    return () => window.removeEventListener("resize", fitCenterImage);
  }, [product?.id, currentImageUrl]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        // Determine which product to load based on category or handle
        let productHandle;
        if (category && categoryProductMap[category]) {
          productHandle = categoryProductMap[category];
        } else {
          productHandle = id || "tosi";
        }

        const productData = await shopifyService.getProduct(productHandle);
        if (!productData || !productData.title) {
          throw new Error("Invalid product data");
        }

        setProduct(productData);

        // Fetch the rating for this product
        if (productData.id) {
          fetchProductRating(productData.id);
        }

        if (productData.variants?.edges?.length > 0) {
          const available = productData.variants.edges.find(
            (e) => e.node.availableForSale
          );
          const first = available || productData.variants.edges[0];
          setSelectedVariant(first.node);
        } else {
          setSelectedVariant(null);
        }

        setCurrentIndex(0);
        await fetchOtherProducts(productData.id);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, category]);

  const isColorDark = (r, g, b) => (r * 299 + g * 587 + b * 114) / 1000 < 128;

  const extractColor = () => {
    const colorThief = new ColorThief();
    const img = imgRef.current;
    if (img && img.complete) {
      try {
        const [r, g, b] = colorThief.getColor(img);
        setBgColor(`rgb(${r}, ${g}, ${b})`);
        setTextColor(isColorDark(r, g, b) ? "#fff" : "#000");
      } catch (err) {
        console.warn("Failed to extract color", err);
      }
    }
  };

  const decrease = () => setCount((p) => (p === 1 ? 1 : p - 1));
  const increase = () => setCount((p) => p + 1);

  const handlePrev = () => {
    if (!product?.images?.edges || product.images.edges.length <= 1) return;
    setCurrentIndex((p) => (p === 0 ? product.images.edges.length - 1 : p - 1));
  };

  const getCleanProductId = (shopifyId) => {
    // Extract just the numeric ID at the end
    return shopifyId.split("/").pop();
  };

  const handleNext = () => {
    if (!product?.images?.edges || product.images.edges.length <= 1) return;
    setCurrentIndex((p) => (p === product.images.edges.length - 1 ? 0 : p + 1));
  };

  const handleThumbnail = (index) => setCurrentIndex(index);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setCount(1);
  };

  const handleAddToCart = () => {
    if (count > 0 && product && selectedVariant?.availableForSale) {
      try {
        addToCart(product, selectedVariant, count);
        setIsCartOpen(true);
        setCount(1);
      } catch (err) {
        console.error("Error adding to cart:", err);
      }
    }
  };

  const handleOtherProductClick = async (productHandle) => {
    try {
      setLoading(true);
      setError(null);

      const newProduct = await shopifyService.getProduct(productHandle);
      if (!newProduct || !newProduct.title) {
        throw new Error("Invalid product data");
      }

      setProduct(newProduct);

      if (newProduct.variants?.edges?.length > 0) {
        const available = newProduct.variants.edges.find(
          (e) => e.node.availableForSale
        );
        const first = available || newProduct.variants.edges[0];
        setSelectedVariant(first.node);
      } else {
        setSelectedVariant(null);
      }

      setCurrentIndex(0);
      setCount(1);
      await fetchOtherProducts(newProduct.id);

      document.querySelector(".product-container")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (err) {
      console.error("Error switching product:", err);
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount, currencyCode) => {
    const price = parseFloat(amount);
    switch (currencyCode) {
      case "INR":
        return `₹${price.toFixed(2)}`;
      case "USD":
        return `$${price.toFixed(2)}`;
      default:
        return `${currencyCode} ${price.toFixed(2)}`;
    }
  };

  const getProductImage = (node) =>
    node.images?.edges?.[0]?.node?.url || "/assets/logo.png";

  const getProductPrice = (node) => {
    if (node.variants?.edges?.length > 0) {
      const v = node.variants.edges[0].node;
      return formatPrice(v.price.amount, v.price.currencyCode);
    }
    return "Price not available";
  };

  useEffect(() => {
    const timer = setTimeout(extractColor, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, product]);

  if (loading) {
    return (
      <div className="productListing">
        <Navbar />
        <TopBanner />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            fontSize: "18px",
          }}
        >
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="productListing">
        <Navbar />
        <TopBanner />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h2>Product Not Found</h2>
          <p>{error || "The requested product could not be found."}</p>
          <p>
            Handle: <code>{handle}</code>
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "10px 20px",
              background: "#4B2C20",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="productListing"
      style={{
        backgroundColor: bgColor,
        transition: "background-color 0.6s ease",
        color: textColor,
      }}
    >
      <Navbar />
      <TopBanner />

      <AnimatedSection
        animation="fadeInUp"
        duration={0.8}
        className="product-container"
      >
        <AnimatedSection
          animation="fadeInLeft"
          delay={0.2}
          className="product-gallery"
        >
          {productImages.length > 1 && (
            <FaChevronLeft onClick={handlePrev} className="nav-arrow" />
          )}
          <div className="product-image">
            {currentImage ? (
              <img
                ref={imgRef}
                src={currentImage.url}
                alt={currentImage.altText || product.title}
                className="main-image fade"
                crossOrigin="anonymous"
                onLoad={extractColor}
                onError={(e) => {
                  console.error("Failed to load image:", e);
                  e.currentTarget.src = "/assets/placeholder.png";
                }}
              />
            ) : (
              <div
                className="placeholder-image"
                style={{
                  width: "100%",
                  height: "400px",
                  background: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                }}
              >
                <p>No image available</p>
              </div>
            )}

            {productImages.length > 1 && (
              <AnimatedSection
                animation="fadeInUp"
                delay={0.4}
                className="thumbnail-gallery"
              >
                {productImages.map((edge, index) => (
                  <img
                    key={index}
                    src={edge.node.url}
                    alt={edge.node.altText || `${product.title} ${index + 1}`}
                    onClick={() => handleThumbnail(index)}
                    className={`thumbnail ${
                      currentIndex === index ? "active" : ""
                    }`}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ))}
              </AnimatedSection>
            )}
          </div>
          {productImages.length > 1 && (
            <FaChevronRight onClick={handleNext} className="nav-arrow" />
          )}
        </AnimatedSection>

        {/* Details */}
        <AnimatedSection
          animation="fadeInRight"
          delay={0.3}
          className="details"
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "left",
          }}
        >
          <AnimatedSection
            animation="fadeInUp"
            delay={0.4}
            className="product-details"
          >
            <h1 style={{ color: textColor }}>Health Bars</h1>
            <h2>{product.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <FaStar style={{ color: "gold" }} />
                <p>
                  {reviewStats.averageRating
                    ? reviewStats.averageRating.toFixed(1)
                    : "0.0"}
                </p>
              </div>
              <p>{reviewStats.totalReviews || 0} Reviews</p>
            </div>
            {product.description && (
              <p
                className="product-description"
                style={{ margin: "15px 0", lineHeight: "1.5" }}
              >
                {product.description}
              </p>
            )}
          </AnimatedSection>

          {product.variants?.edges?.length > 1 && (
            <AnimatedSection
              animation="fadeInUp"
              delay={0.5}
              className="variant-selector"
              style={{ margin: "20px 0" }}
            >
              <h3 style={{ marginBottom: "10px" }}>Options:</h3>
              <div
                className="variants"
                style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
              >
                {product.variants.edges.map((edge, index) => (
                  <AnimatedSection
                    key={edge.node.id}
                    animation="scaleIn"
                    delay={0.6 + index * 0.1}
                  >
                    <button
                      onClick={() => handleVariantChange(edge.node)}
                      className={`variant-option ${
                        selectedVariant?.id === edge.node.id ? "selected" : ""
                      }`}
                      disabled={!edge.node.availableForSale}
                      style={{
                        padding: "8px 16px",
                        border:
                          selectedVariant?.id === edge.node.id
                            ? "2px solid #4B2C20"
                            : "1px solid #ccc",
                        borderRadius: "6px",
                        background: edge.node.availableForSale
                          ? "white"
                          : "#f5f5f5",
                        cursor: edge.node.availableForSale
                          ? "pointer"
                          : "not-allowed",
                        opacity: edge.node.availableForSale ? 1 : 0.6,
                      }}
                    >
                      {edge.node.title}
                      {edge.node.title !== "Default Title" && (
                        <span style={{ fontSize: "12px", display: "block" }}>
                          {formatPrice(
                            edge.node.price.amount,
                            edge.node.price.currencyCode
                          )}
                        </span>
                      )}
                    </button>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* Other Products */}
          <AnimatedSection
            animation="fadeInUp"
            delay={0.6}
            className="other-products"
            style={{ margin: "30px 0" }}
          >
            <h2>Other Products</h2>
            {otherProductsLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    animation: "spin 1s linear infinite",
                    background: "none",
                  }}
                />
              </div>
            ) : otherProducts.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: "15px",
                  marginTop: "15px",
                  maxHeight: "300px",
                  overflow: "hidden",
                }}
              >
                {otherProducts.map((edge, index) => {
                  const node = edge.node || edge;
                  const isCurrent = node.handle === product?.handle;
                  return (
                    <AnimatedSection
                      key={node.id || index}
                      animation="scaleIn"
                      delay={0.7 + index * 0.1}
                      className="product"
                      onClick={() =>
                        !isCurrent && handleOtherProductClick(node.handle)
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "fit-content",
                        alignItems: "center",
                        cursor: isCurrent ? "default" : "pointer",
                        transition: "all 0.3s ease",
                        opacity: isCurrent ? 0.7 : 1,
                      }}
                    >
                      <img
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: "6px",
                          marginBottom: "8px",
                          filter: isCurrent ? "grayscale(50%)" : "none",
                        }}
                        src={getProductImage(node)}
                        alt={node.title}
                        onError={(e) =>
                          (e.currentTarget.src = "/assets/logo.png")
                        }
                      />
                      {isCurrent && (
                        <div
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            backgroundColor: "#4B2C20",
                            color: "white",
                            fontSize: 8,
                            padding: "2px 4px",
                            borderRadius: "3px",
                            fontWeight: "bold",
                          }}
                        >
                          CURRENT
                        </div>
                      )}
                      <p
                        style={{
                          fontSize: 12,
                          textAlign: "center",
                          margin: "0 0 5px 0",
                          fontWeight: "bold",
                          lineHeight: 1.2,
                        }}
                      >
                        {node.title}
                      </p>
                      <p style={{ fontSize: 11, color: "#666", margin: 0 }}>
                        {getProductPrice(node)}
                      </p>
                    </AnimatedSection>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#666", fontSize: "14px", padding: "20px 0" }}>
                No other products available at the moment.
              </p>
            )}
          </AnimatedSection>

          {/* Price and Add to Cart */}
          {selectedVariant && (
            <AnimatedSection animation="fadeInUp" delay={0.7}>
              <h2 style={{ marginBottom: 0 }}>
                MRP:{" "}
                {formatPrice(
                  selectedVariant.price.amount,
                  selectedVariant.price.currencyCode
                )}
              </h2>
              {selectedVariant.compareAtPrice &&
                parseFloat(selectedVariant.compareAtPrice.amount) >
                  parseFloat(selectedVariant.price.amount) && (
                  <p
                    style={{
                      marginTop: 0,
                      textDecoration: "line-through",
                      color: "black",
                      fontSize: 14,
                    }}
                  >
                    {" "}
                    {formatPrice(
                      selectedVariant.compareAtPrice.amount,
                      selectedVariant.compareAtPrice.currencyCode
                    )}
                  </p>
                )}
              {!selectedVariant.availableForSale && (
                <p style={{ color: "red", fontWeight: "bold", marginTop: 5 }}>
                  Out of Stock
                </p>
              )}
            </AnimatedSection>
          )}

          <AnimatedSection animation="fadeInUp" delay={0.8}>
            <p
              style={{
                backgroundColor: "yellow",
                width: "fit-content",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: 14,
                margin: "10px 0",
              }}
            >
              Save Rs.29 on every order!
            </p>
          </AnimatedSection>

          <AnimatedSection
            animation="fadeInUp"
            delay={0.9}
            style={{ display: "flex", alignItems: "center", gap: 20 }}
          >
            <div
              className="quantity"
              style={{
                display: "flex",
                alignItems: "center",
                height: "35px",
                width: "90px",
                justifyContent: "space-between",
                border: "1px solid black",
                borderRadius: "25px",
                padding: 0,
              }}
            >
              <button
                onClick={increase}
                style={{
                  background: "#4B2C20",
                  color: "white",
                  padding: 8,
                  height: 35,
                  width: 25,
                  fontSize: "16px",
                  border: "none",
                  borderRadius: "20px 0 0 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
              <p style={{ margin: "0 15px", fontSize: 18, fontWeight: "bold" }}>
                {count}
              </p>
              <button
                onClick={decrease}
                style={{
                  background: "#4B2C20",
                  color: "white",
                  padding: 8,
                  fontSize: "20px",
                  height: 35,
                  border: "none",
                  width: 25,
                  borderRadius: "0 20px 20px 0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                -
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={count === 0 || !selectedVariant?.availableForSale}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                background:
                  count === 0 || !selectedVariant?.availableForSale
                    ? "#ccc"
                    : "#4b2c20",
                color: "white",
                border: "none",
                cursor:
                  count === 0 || !selectedVariant?.availableForSale
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  count === 0 || !selectedVariant?.availableForSale ? 0.6 : 1,
                transition: "all 0.3s ease",
                fontSize: 16,
                fontWeight: "bold",
              }}
            >
              {!selectedVariant?.availableForSale
                ? "Out of Stock"
                : "Add to Cart"}
            </button>
          </AnimatedSection>
        </AnimatedSection>
      </AnimatedSection>

      {/* What's inside - Animated */}
      <div
        ref={ingredientsRef}
        className="ingredients-wrapper"
        style={{
          opacity: ingredientsInView ? 1 : 0,
          transform: ingredientsInView ? "translateY(0px)" : "translateY(60px)",
          transition: "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <AnimatedSection animation="fadeInUp" delay={0.2}>
          <h1 style={{ marginBottom: "100px" }}>
            What's inside in {product.title}?
          </h1>
        </AnimatedSection>
        <div className="ingredients-grid">
          <div className="outer-wrapper">
            <div className="green-semi-circle" ref={semiCircleRef}>
              {currentImage && (
                <AnimatedSection
                  animation="rotateIn"
                  delay={0.4}
                  style={centerImgStyle}
                >
                  <img
                    ref={centerImgRef}
                    src={currentImage.url}
                    alt={product.title}
                    className={`center-bar ${
                      isPortrait ? "portrait" : "landscape"
                    }`}
                    onLoad={fitCenterImage}
                    onError={(e) =>
                      (e.currentTarget.src = "/assets/placeholder.png")
                    }
                    style={centerImgStyle}
                  />
                </AnimatedSection>
              )}
              {ingredients.map((ing, idx) => (
                <AnimatedSection
                  key={idx}
                  animation="scaleIn"
                  delay={0.6 + idx * 0.15}
                  className={`bubble bubble-${idx}`}
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    cursor: "pointer",
                  }}
                >
                  <img src={ing.image} alt={ing.name} />
                  <span>{ing.name}</span>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits - Animated */}
      <div
        ref={benefitsRef}
        className="benefits-wrapper"
        style={{
          opacity: benefitsInView ? 1 : 0,
          transform: benefitsInView ? "translateY(0px)" : "translateY(80px)",
          transition: "all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <AnimatedSection animation="fadeInUp" delay={0.2}>
          <h1>
            Checkout on the
            <br />
            Health Benefits
          </h1>
        </AnimatedSection>
        <div className="benefits-container">
          {currentImage && (
            <AnimatedSection animation="rotateIn" delay={0.4}>
              <img
                src={currentImage.url}
                alt={product.title}
                className="center-bar1"
              />
            </AnimatedSection>
          )}
          <div className="d-flex flexdir-c" style={{ fontSize: "30px" }}>
            {benefits.map((ben, index) => (
              <AnimatedSection
                key={ben.id}
                animation="fadeInRight"
                delay={0.6 + index * 0.2}
                className={`benefits benefits-${ben.id}`}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: benefitsInView
                      ? "rotate(360deg)"
                      : "rotate(0deg)",
                    transition: `transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${
                      0.8 + index * 0.2
                    }s`,
                  }}
                >
                  {ben.icon}
                </span>
                <span>{ben.content}</span>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>

      {/* Combo - Animated */}
      <AnimatedSection animation="fadeInUp" className="combo-wrapper">
        <AnimatedSection animation="fadeInUp" delay={0.2}>
          <h1>
            The Energizing
            <br />
            {product.title} Combo Packs
          </h1>
        </AnimatedSection>
        <div className="products fade-in">
          <AnimatedSection
            animation="scaleIn"
            delay={0.4}
            className="product-card"
          >
            <img src="/assets/logo.png" alt="Choco Energy Bar" />
            <p>Choco Energy Bar</p>
            <button>View Product</button>
          </AnimatedSection>
          <AnimatedSection
            animation="scaleIn"
            delay={0.6}
            className="product-card"
          >
            <img src="/assets/logo.png" alt="Peanut Crunch" />
            <p>Peanut Crunch</p>
            <button>View Product</button>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      <AnimatedSection animation="fadeInUp">
        <Comment
          key={product?.id} // Add a key to force re-render when product changes
          productId={product?.id ? getCleanProductId(product.id) : ""}
        />
      </AnimatedSection>
      <CartSidebar />
      <AnimatedSection animation="fadeInUp">
        <Footer />
      </AnimatedSection>
    </div>
  );
}
