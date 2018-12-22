// import * as React from "react";
// import styled from "styled-components";

// import ClickOutside from "./ClickOutside";
// import { colors, transitions, shadows } from "../styles";

// const SWrapper = styled.div`
//   width: 100%;
//   z-index: 2;
//   position: relative;
//   box-shadow: none;
// `;

// const SCaret = styled.img`
//   position: absolute;
//   cursor: pointer;
//   right: 7px;
//   top: calc(50% - 7px);
//   width: 14px;
//   height: 14px;
//   mask: url(${caret}) center no-repeat;
//   mask-size: 90%;
//   background-color: ${({ dark }) =>
//     dark ? `rgb(${colors.dark})` : `rgba(${colors.white}, 0.8)`};
// `;

// const SIcon = styled.div`
//   height: 15px;
//   width: 15px;
//   mask: url(${circle}) center no-repeat;
//   mask-size: 60%;
//   display: ${({ iconColor }) => (iconColor ? "block" : "none")};
//   background-color: ${({ iconColor }) =>
//     iconColor ? `rgb(${colors[iconColor]})` : "transparent"};
// `;

// const SRowWrapper = styled.div`
//   min-width: 70px;
//   border-radius: 6px;
//   position: relative;
//   color: rgb(${colors.dark});
//   font-size: ${fonts.size.small};
//   font-weight: ${fonts.weight.medium};
//   font-family: ${({ monospace }) =>
//     monospace ? `${fonts.family.SFMono}` : `inherit`};
//   text-align: center;
//   outline: none;
//   & p {
//     margin: 0 4px;
//   }
// `;

// const SSelectedWrapper = styled(SRowWrapper)`
//   outline: none;
//   background: transparent;
//   color: ${({ dark }) =>
//     dark ? `rgb(${colors.dark})` : `rgba(${colors.white}, 0.8)`};
//   border-radius: 6px;
//   & > div {
//     cursor: ${({ noOptions }) => (noOptions ? "auto" : "pointer")};
//     padding: ${({ noOptions }) => (noOptions ? `8px` : `8px 26px 8px 8px`)};
//     background-size: 8px;
//     display: flex;
//     align-items: center;
//     justify-content: space-between;
//   }
//   & ${SCaret} {
//     opacity: ${({ noOptions }) => (noOptions ? 0 : 1)};
//   }
// `;

// const SDropdownWrapper = styled(SRowWrapper)`
//   position: absolute;
//   background: rgb(${colors.white});
//   color: rgb(${colors.darkGrey});
//   border-radius: 6px;
//   width: 100%;
//   top: 100%;
//   opacity: ${({ show }) => (show ? 1 : 0)};
//   visibility: ${({ show }) => (show ? "visible" : "hidden")};
//   pointer-events: ${({ show }) => (show ? "auto" : "none")};
//   -webkit-box-shadow: ${shadows.medium};
//   box-shadow: ${shadows.medium};
//   max-height: 280px;
//   overflow-x: hidden;
//   overflow-y: auto;
// `;

// const SRow = styled.div`
//   cursor: pointer;
//   transition: ${transitions.base};
//   border-top: 1px solid rgba(${colors.lightGrey}, 0.7);
//   font-weight: ${({ selected }) =>
//     selected ? fonts.weight.bold : fonts.weight.normal};
//   padding: 6px;
//   margin: auto 6px;
//   width: auto;
//   text-align: center;
//   align-items: center;
//   justify-content: center;
//   &:hover {
//     opacity: 0.6;
//   }
// `;

// interface IDropwdownState {
//   showDropdown: boolean;
// }

// interface IDropwdownProps {
//   options: any[];
//   selected: any;
//   onChange: any;
// }

// class Dropwdown extends React.Component<IDropwdownProps> {
//   public state: IDropwdownState;
//   constructor(props: IDropwdownProps) {
//     super(props);
//     this.state = {
//       showDropdown: false
//     };
//   }
//   public onChangeSelected = (selected: any) => {
//     this.setState({ showDropdown: false });
//     if (this.props.onChange) {
//       this.props.onChange(selected);
//     }
//   };
//   public onClickOutside = () => {
//     if (this.state.showDropdown) {
//       this.setState({ showDropdown: false });
//     }
//   };
//   public toggleDropdown = () => {
//     if (this.props.onChange) {
//       this.setState({ showDropdown: !this.state.showDropdown });
//     }
//   };

//   public render() {
//     const { showDropdown } = this.state;
//     const { options, selected, onChange, ...props } = this.props;
//     return (
//       <ClickOutside onClickOutside={this.onClickOutside}>
//         <SWrapper {...props}>
//           <SSelectedWrapper
//             show={showDropdown}
//             noOptions={!onChange || Object.keys(options).length < 2}
//             onClick={this.toggleDropdown}
//           >
//             <div>
//               <SIcon iconColor={options[_selected].color || iconColor} />
//               <p>{options[_selected][displayKey]}</p>
//             </div>
//             <SCaret dark={dark} />
//           </SSelectedWrapper>
//           <SDropdownWrapper
//             monospace={monospace}
//             show={showDropdown}
//             noOptions={!onChange || Object.keys(options).length < 2}
//           >
//             {onChange &&
//               Object.keys(options).map(key => (
//                 <SRow
//                   selected={key === _selected}
//                   key={options[key][displayKey]}
//                   onClick={() => this.onChangeSelected(key)}
//                 >
//                   <p>{options[key][displayKey]}</p>
//                 </SRow>
//               ))}
//           </SDropdownWrapper>
//         </SWrapper>
//       </ClickOutside>
//     );
//   }
// }

// export default Dropwdown;
