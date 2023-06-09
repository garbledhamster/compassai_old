const OverlayHelpWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const OverlayHelpContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 768px;
  padding: 20px;
  background-color: #333;
  color: #fff;

  @media (min-width: 768px) {
    width: 50%;
  }
`;

const TitleBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TitleContainer = styled.h2``;

const ExitButton = styled.button`
  border: none;
  background-color: transparent;
  color: white;
  cursor: pointer;
`;

const DisplayContainer = styled.div``;

const ImageContainer = styled.img``;

const AltTextContainer = styled.div`
  display: none;
`;

const DescriptionContainer = styled.p``;

const HelpOverlay = ({ config }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    feather.replace();
  });

  const handleClick = () => {
    setVisible(!visible);
  };

  const handleExit = () => {
    setVisible(false);
  };

  return (
    React.createElement(React.Fragment, null,
      visible && React.createElement(OverlayHelpWrapper, null,
        React.createElement(OverlayHelpContainer, null,
          React.createElement(TitleBar, null,
            React.createElement(TitleContainer, null, config.title),
            React.createElement(ExitButton, { onClick: handleExit },
              React.createElement('i', { 'data-feather': 'x' })
            )
          ),
          React.createElement(DisplayContainer, null,
            React.createElement(ImageContainer, { src: config.image, alt: marked.parse(config.altText) }),
            React.createElement(AltTextContainer, { dangerouslySetInnerHTML: { __html: marked.parse(config.altText) } })
          ),
          React.createElement(DescriptionContainer, { dangerouslySetInnerHTML: { __html: marked.parse(config.description) } })
        )
      ),
      React.createElement('button', { onClick: handleClick }, 'Toggle Help Overlay')
    )
  );
};

const factoryResetConfig = {
  title: "How to factory reset the app",
  image: "https://example.com/factory-reset.gif",
  description:
    'To reset the app, follow these steps:\n\n1. Open the menu.\n2. Click the <i class="fi-rr-rotate"></i> icon.\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
  altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
};

const usingMemoriesConfig = {
  title: "How to use the Memories system",
  image: "https://example.com/using-memories.gif",
  description: 'Memories can be stored by selecting the text you want to remember and clicking the <i class="fi-rr-bookmark"></i> button in the hotbar.',
  altText: `1. Highlight text you want to store.\n
             2. Open the menu with the <i class="fi-rr-menu-dots"></i> icon.\n
             3. Click the <i class="fi-rr-bookmark"></i> button in the hotbar. This will store the selected text as a memory.\n
             4. Click the <i class="fi-rr-bookmark"></i> Memories button in the main menu.\n
             5. You can now see all of your stored memories.`,
};

const usingStoredMemoriesConfig = {
  title: "How to use stored Memories",
  image: "https://example.com/using-stored-memories.gif",
  description: `Memories are instructions that can be sent to the AI. For example: 
                 1. Ask for a summary of a book.
                 2. Get recommendations based on your preferences.
                 3. Ask for the weather in your city.`,
  altText: `1. Open the menu.\n
             2. Click the <i class="fi-rr-bookmark"></i> Memories button in the main menu.\n
             3. Find a memory you stored and click the "Important" button, this will activate your memory for usage.`,
};
