import civicLogo from "../assets/civic-logo.png";
import { Globe, Mail, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";

function Footer() {
  return (
    <footer className="footer" id="contact">

      <div className="footer-container">


        {/* BRAND */}

        <div className="footer-brand">

          <div className="footer-logo">

            <img
              src={civicLogo}
              alt="CivicConnect Logo"
            />

            <span>
              CIVIC <span>CONNECT</span>
            </span>

          </div>

          <p>
            Building smarter cities through technology,
            transparency, and trust.
          </p>

          <div className="social-icons">
            <span><Globe size={16} strokeWidth={2} /></span>
            <span><MessageCircle size={16} strokeWidth={2} /></span>
            <span><Mail size={16} strokeWidth={2} /></span>
            <span><Share2 size={16} strokeWidth={2} /></span>
          </div>

        </div>


        {/* QUICK LINKS */}

        <div className="footer-column">

          <h3>
            Quick Links
          </h3>

          <a href="#home">
            Home
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#roles">
            Roles
          </a>

          <a href="#about">
            About
          </a>

          <a href="#get-started">
            Get Started
          </a>

          <a href="#contact">
            Contact
          </a>

        </div>


        {/* CONTACT */}

        <div className="footer-column">

          <h3>
            Contact Us
          </h3>

          <p className="footer-contact">
            <Mail size={16} aria-hidden="true" /> support@civicconnect.gov
          </p>

          <p className="footer-contact">
            <Phone size={16} aria-hidden="true" /> +91 98765 43210
          </p>

          <p className="footer-contact">
            <MapPin size={16} aria-hidden="true" /> Smart City, India
          </p>

        </div>


        {/* WORKING HOURS */}

        <div className="footer-column">

          <h3>
            Working Hours
          </h3>

          <p>
            Mon - Sat: 9:00 AM - 6:00 PM
          </p>

          <p>
            We're here to help!
          </p>

        </div>

      </div>


      <div className="footer-bottom">
        © {new Date().getFullYear()} CivicConnect. All rights reserved.
      </div>

    </footer>
  );
}

export default Footer;