import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database import SessionLocal
from app.models.bill import Bill

# 10 real bills from https://www.parliament.go.ke/the-national-assembly/house-business/bills
KENYAN_BILLS = [
    {
        "title": "The Power of Mercy Bill, 2025",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2026-02/THE%20POWER%20OF%20MERCY%20BILL%2C2025.pdf",
        "summary": "A Bill to provide for the exercise of the power of mercy as contemplated under Article 133 of the Constitution; to establish the Power of Mercy Advisory Committee; to provide for the functions, powers and procedures of the Committee; and for connected purposes."
    },
    {
        "title": "The Kenya Psychiatric Association Bill, 2024",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2025-01/The%20Kenya%20Psychiatric%20Association%20Bill%2C%202024.pdf",
        "summary": "A Bill to provide for the incorporation of the Kenya Psychiatric Association; to establish the functions and governance of the Association; to promote the practice of psychiatry in Kenya; and for connected purposes."
    },
    {
        "title": "The Natural Resources (Classes of Transactions Subject to Ratification) Bill, 2024",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2025-02/The%20Natural%20Resources%20%28Classes%20of%20Transactions%20Subject%20to%20Ratification%29%20Bill%2C%202024.pdf",
        "summary": "A Bill to specify classes of agreements relating to natural resources that are subject to ratification by Parliament under Article 71 of the Constitution; and for connected purposes."
    },
    {
        "title": "The Statute Law (Miscellaneous Amendments) Bill, 2025",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2025-10/Statute%20Law%20%28Miscellaneous%20Amendments%29%20Bill%2C%202025.pdf",
        "summary": "A Bill to amend various statutes to bring them into conformity with the Constitution and other written law; to update and align provisions across multiple Acts of Parliament; and for connected purposes."
    },
    {
        "title": "The Affordable Housing Bill, 2024",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2024-05/The%20Affordable%20Housing%20Bill%2C%202024.pdf",
        "summary": "A Bill to provide a legal framework for the implementation of the Affordable Housing Programme; to establish the Affordable Housing Board; to provide for the allocation and management of affordable housing units; and for connected purposes."
    },
    {
        "title": "The Business Laws (Amendment) Bill, 2024",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2024-09/The%20Business%20Laws%20%28Amendment%29%20Bill%2C%202024.pdf",
        "summary": "A Bill to amend the Companies Act, Insolvency Act, Limited Liability Partnership Act and other business-related statutes to enhance the ease of doing business, streamline registration processes, and modernise Kenya's commercial legal framework."
    },
    {
        "title": "The Persons with Disabilities Bill, 2023",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2023-11/The%20Persons%20With%20Disabilities%20Bill%2C%202023.pdf",
        "summary": "A Bill to repeal and replace the Persons with Disabilities Act; to give effect to the UN Convention on the Rights of Persons with Disabilities; to provide for the rights of persons with disabilities including healthcare, education, and employment; and for connected purposes."
    },
    {
        "title": "The Anti-Money Laundering and Combating of Terrorism Financing Laws (Amendment) Bill, 2025",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2025-03/Anti-Money%20Laundering%20and%20Combating%20of%20Terrorism%20Financing%20Laws%20%28Amendment%29%20Bill%2C%202025.pdf",
        "summary": "A Bill to amend the Proceeds of Crime and Anti-Money Laundering Act and related legislation to strengthen Kenya's framework for combating money laundering, terrorism financing, and proliferation financing in line with FATF recommendations."
    },
    {
        "title": "The Kenya National Qualifications Framework Bill, 2024",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2024-07/The%20Kenya%20National%20Qualifications%20Framework%20Bill%2C%202024.pdf",
        "summary": "A Bill to establish a national qualifications framework; to provide for the recognition, accreditation and equating of qualifications; to establish the Kenya National Qualifications Authority; and for connected purposes."
    },
    {
        "title": "The Conflict of Interest Bill, 2023",
        "document_url": "https://www.parliament.go.ke/sites/default/files/2023-10/The%20Conflict%20of%20Interest%20Bill%2C%202023.pdf",
        "summary": "A Bill to provide for the management and resolution of conflicts of interest by public officers; to establish a framework for declaration of interests; to strengthen the ethical standards applicable to State officers and public servants; and for connected purposes."
    },
]


def seed_bills():
    db = SessionLocal()
    try:
        added = 0
        for bill_data in KENYAN_BILLS:
            existing = db.query(Bill).filter(Bill.document_url == bill_data["document_url"]).first()
            if existing:
                print(f"  Already exists: {bill_data['title'][:50]}")
                continue
            bill = Bill(
                title=bill_data["title"],
                summary=bill_data["summary"],
                document_url=bill_data["document_url"]
            )
            db.add(bill)
            added += 1

        db.commit()
        print(f"\nDone! Added {added} bills.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_bills()
