// Generic payment-return page intentionally contains NO client cabinet
// token, Stripe client_secret, account ID or payment status claim.
// Stripe's 3DS redirect can safely finish here. The actual signed payment
// status is available only in the authenticated personal booking link.
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function UsPayC11PaymentReturnPage() {
  useEffect(()=>{
    // Stripe may append non-secret status parameters. Strip everything from
    // the address bar and browser history; never retain payment identifiers.
    if(window.location.search){
      window.history.replaceState(
        window.history.state,"",
        window.location.origin+window.location.pathname+"#/client-payment-return"
      );
    }
  },[]);
  return (
    <main style={{maxWidth:640,margin:"48px auto",padding:24,
      borderRadius:14,background:"#fff",fontFamily:"Inter,Arial,sans-serif",
      lineHeight:1.6}}>
      <h1 style={{fontSize:24,marginTop:0}}>Stripe payment confirmation</h1>
      <p>
        Your bank authentication has returned to TOTEM.
        Payment confirmation may still be processing.
      </p>
      <p>
        Open your personal TOTEM booking link to view the verified status.
        A redirect alone does not mean the payment was received.
      </p>
      <Link to="/" style={{display:"inline-block",marginTop:12}}>
        TOTEM home
      </Link>
    </main>
  );
}
