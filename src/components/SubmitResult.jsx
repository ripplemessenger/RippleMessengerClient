import { TxResult } from "../lib/RippleConst"

const SubmitResult = ({ result }) => {
  return (
    <div className="justify-center items-center">
      {
        result !== null &&
        <div className="flex justify-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
          {
            result === TxResult.Success ?
              <span className='text-3xl font-bold text-green-800 dark:text-green-200'>
                SUCCESS
              </span>
              :
              <span className='text-3xl font-bold text-red-800 dark:text-red-200'>
                {result}
              </span>
          }
        </div>
      }
    </div>
  )
}

export default SubmitResult