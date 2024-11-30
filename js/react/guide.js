export const guideOverlayContainer = styled.div`
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

export const guideOverlayContent = styled.div`
  display: flex;
  flex-direction: column;
  background-color: rgba(74, 79, 90, 1);
  color: white;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 50px;
  gap: 10px;
`;

export const guideImageContainer = styled.div``;

export const guideCloseButton = styled.button`
  classname: button;
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
  height: 50px;
  width: 50px;
  min-wdith: 30px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
`;


