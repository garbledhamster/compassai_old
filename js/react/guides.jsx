const { React, ReactDOM, styled } = window;
const { useState, useEffect } = React;

const GuideOverlayContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 9999;
  padding: 10px;
  justify-content: center;
  align-items: center;
`;

const GuideOverlayContent = styled.div`
  width: max-content;
  height: max-content;
  display: flex;
  flex-direction: column;
  background-color: rgba(74, 79, 90, 0);
  color: white;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 50px;
`;

const GuideImageContainer = styled.div``;

const GuideCloseButton = styled.button`
  border: none;
  background-color: white;
  color: black;
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  margin: 25px;
  border-radius: 50%;
  font-size: 25px;
  height: 30px;
  width: 30px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
`;
const guidesJSON = {
  title: 'Getting started with Compass AI',
  image: 'assets/guides/Getting Started.gif',
  description: 'To get started, simply enter a message in the chat to start a conversation.',
  altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
};


function GuideOverlay({ guideData, handleHide }) {
  return (
    <GuideOverlayContainer>
      <GuideOverlayContent>
        <div>
          <h2>{guideData.title}</h2>
          <GuideCloseButton onClick={handleHide}>X</GuideCloseButton>
        </div>
        <GuideImageContainer>
          <img
            src={guideData.image}
            alt={guideData.altText}
            // ... (style props omitted for brevity)
          />
          <div
            className="alt-text-container"
            style={{ display: "none" }}
            dangerouslySetInnerHTML={{ __html: guideData.altText }}
          />
        </GuideImageContainer>
        <p dangerouslySetInnerHTML={{ __html: guideData.description }} />
      </GuideOverlayContent>
    </GuideOverlayContainer>
  );
}

function GuideShowOverlay({ guideData, parentID }) {
  const [showGuide, setShowGuide] = useState(false);

  const handleShow = () => setShowGuide(true);
  const handleHide = () => setShowGuide(false);

  useEffect(() => {
    if (guideData) handleShow();
  }, [guideData]);

  useEffect(() => {
    const parentElement = document.getElementById(parentID);
    if (!parentElement) return; // Skip rendering if parent element doesn't exist

    const overlayElement = document.createElement('div');
    parentElement.prepend(overlayElement);

    const root = ReactDOM.createRoot(overlayElement);
    if (showGuide) {
      root.render(<GuideOverlay guideData={guideData} handleHide={handleHide} />);
    } else {
      setTimeout(() => {
        root.unmount();
      }, 0);
    }
  }, [guideData, parentID, showGuide]);

  return null; // This component doesn't render anything itself
}

// Here we can use the renderOverlay function
function renderOverlay(parentID) {
  ReactDOM.createRoot(document.getElementById(parentID)).render(
    <GuideShowOverlay guideData={guidesJSON} parentID={parentID} />
  );
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => renderOverlay('parent-element-id'));
} else {
  renderOverlay('main-wrapper');
}