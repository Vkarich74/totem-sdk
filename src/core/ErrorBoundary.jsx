import React from "react";

export default class ErrorBoundary extends React.Component {

  constructor(props){
    super(props)

    this.state = {
      hasError:false,
      error:null
    }
  }

  static getDerivedStateFromError(error){
    return {
      hasError:true,
      error:error
    }
  }

  componentDidCatch(error,info){
    console.error("TOTEM UI ERROR",error)
    console.error(info)
  }

  render(){

    if(this.state.hasError){

      return (
        <div style={{
          padding:"40px",
          fontFamily:"Arial",
          maxWidth:"800px",
          margin:"0 auto"
        }}>
          <h2>Interface error</h2>

          <p>
            The interface encountered an unexpected error.
          </p>

          <button
            onClick={()=>window.location.reload()}
            style={{
              padding:"10px 20px",
              marginTop:"20px",
              cursor:"pointer"
            }}
          >
            Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }

}