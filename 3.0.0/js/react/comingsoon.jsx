const { React, ReactDOM } = window;


const ComingSoonOverlay = () => {
  const overlayStyle = {
    display: 'flex',
    position: 'absolute',
    height: 'calc(100% - 80px)',
    width: '100%',
    bottom: '0px',
    right: '0px',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)', /* Opaque white background */
  };

  const textStyles = {
    fontSize: '24px',
    color: '#000',
    textAlign: 'center',
  };

  return (
    <div style={overlayStyle}>
      <div style={textStyles}>
        <h1>Coming Soon...</h1>
      </div>
    </div>
  );
};

function renderOverlay(parentID) {
  const parentElement = document.getElementById(parentID);
  const overlayElement = document.createElement('div');
  parentElement.prepend(overlayElement);
  const root = ReactDOM.createRoot(overlayElement);
  root.render(<ComingSoonOverlay />);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderOverlay('guidesContainer'));
} else {
  renderOverlay('settingsContainer');
  renderOverlay('conversationsContainer');
  renderOverlay('toolsContainer');
}
