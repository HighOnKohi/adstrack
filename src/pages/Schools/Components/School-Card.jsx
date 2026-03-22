import { useState } from "react";
import { closeIcon, editIcon, trashIcon } from "../../../assets/Icons/index.js";

function SchoolCard({ school, onEdit, onDelete }) {
    const [showModal, setShowModal] = useState(false);

    return(


        <div className="school-card"> 
            <div className="school-card-label">
                <h1> {school.data.Category} </h1>
            </div>

            <div className="school-card-body"> 
                <h1> {school.data.Name} </h1>
                <p> 📍 {school.data.Address} </p>
                <p> ✉️ {school.data.Email} </p>
            </div>

            <div className="school-card-footer-divider"> </div>

            <a className="school-card-view-details-button" onClick={(e)=> {e.preventDefault(); setShowModal(true);}}> View Details ⟶ </a>

            {showModal && (
                <div className="school-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="school-detail-modal" onClick={(e) => e.stopPropagation()}>

                        <button className="close-modal-button" onClick={() => setShowModal(false)}>
                            <img src={closeIcon} alt="close" />
                        </button>
                        
                        <h1>{school.data.Name}</h1>
                        
                        <div className="school-detail-content">
                            <div className="school-detail-section">
                                
                                <h3>School Information</h3>
                                
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Category: </span>
                                    <span className="school-detail-value"> {school.data.Category} </span>
                                </div>
                                
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Address: </span>
                                    <span className="school-detail-value"> {school.data.Address} </span>
                                </div>
                            
                            </div>

                            <div className="school-detail-section">
                            
                                <h3>Contact Information</h3>
                            
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Contact Person: </span>
                                    <span className="school-detail-value"> {school.data.Contact_Person} </span>
                                </div>
                            
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Contact Number: </span>
                                    <span className="school-detail-value"> {school.data.Contact_Num} </span>
                                </div>
                                
                                <div className="school-detail-item">
                                    <span className="school-detail-label"> Email: </span>
                                    <span className="school-detail-value"> {school.data.Email} </span>
                                </div>
                            
                            </div>
                        </div>
                        <div className="school-detail-actions">
                            <button
                                className="school-card-view-details-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onEdit) onEdit(school);
                                }}
                            >
                                <img src={editIcon} alt="Edit" style={{ width: 16, marginRight: 6 }} />
                                Edit
                            </button>
                            <button
                                className="school-card-view-details-button delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                    if (onDelete) onDelete(school);
                                }}
                            >
                                <img src={trashIcon} alt="Delete" style={{ width: 16, marginRight: 6 }} />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchoolCard;